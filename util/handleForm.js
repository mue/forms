const rateLimit = require('lambda-rate-limiter');
const Mailgun = require('mailgun.js');
const mailgun = new Mailgun(require('form-data'));
const isbot = require('isbot');
const formidable = require('formidable-serverless');
const hcaptcha = require('hcaptcha');
const UAParser = require('ua-parser-js');
const ejs = require('ejs');
const strip = require('striptags');

const umami = require('./umami');
const config = require('../config.json');

const ratelimit = rateLimit({
  interval: config.ratelimit.interval
}).check;

const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_KEY
});

module.exports = async (req, res) => {
  // check for generic bots
  if (isbot(req.headers['user-agent'])) {
    await umami.error('/', req, 'bot-detected');
    return res.redirect(303, config.redirect);
  }

  // ratelimit
  try {
    await ratelimit(config.ratelimit.max, req.headers['x-real-ip']);
  } catch (error) {
    await umami.error('/', req, 'ratelimited');
    return res.redirect(303, config.redirect);
  }

  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields) => {
    if (err) {
      await umami.error('/', req, 'parse-failed');
      return res.redirect(303, config.redirect);
    }

    // hcaptcha 
    if (req.query.form === 'contact') {
      const verification = await hcaptcha.verify(process.env.HCAPTCHA_SECRET, fields['h-captcha-response']);
      if (verification.success === false) {
        await umami.error('/', req, 'captcha-failed');
        return res.redirect(303, config.redirect);
      }
    }

    // validate fields
    if (((!fields.Email || !fields.MultiLine) && req.query.form === 'contact') ||
      (!fields.reason || !fields.likelyToTry) && req.query.form === 'uninstall') {
      await umami.error('/', req, 'validation-failed');
      return res.redirect(303, config.redirect);
    }

    // check for valid contact email as this form gets spammed the most
    if (/(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/.test(fields.Email) === false && req.query.form === 'contact') {
      await umami.error('/', req, 'validation-failed');
      return res.redirect(303, config.redirect);
    }

    // format emails
    let data;
    const userAgent = new UAParser(req.headers['user-agent']);

    switch (req.query.form) {
      case 'uninstall':
        const reasons = {
          slow: 'Too slow',
          old: 'Going back to old new tab page',
          broken: 'Didn\'t work properly',
          features: 'Missing features',
          notexpected: 'Not what I expected',
          privacy: 'Privacy concerns',
          language: 'Not available in my language',
          temp: 'Temporarily uninstalled',
          other: 'Other'
        };

        const likelyToTry = Number(strip(fields.likelyToTry));
        if (likelyToTry === 'NaN') {
          await umami.error('/', req, 'validation-failed');
          return res.redirect(303, config.redirect);
        }

        if (!Object.keys(reasons).includes(strip(fields.reason)) || likelyToTry > 10 || likelyToTry < 0) {
          await umami.error('/', req, 'validation-failed');
          return res.redirect(303, config.redirect);
        }

        data = {
          from: 'Mue Uninstall Form <hello@muetab.com>',
          to: config.emails,
          subject: 'New uninstall response',
          html: await ejs.renderFile(__dirname + '/email.ejs', {
            content: `
            <p>Reason: ${reasons[strip(fields.reason)]}</p>
            ${fields.reasonOther ? `<p>Reason (Other): ${strip(fields.reasonOther)}</p>` : ''}
            ${fields.MultiLine ? `<p>Idea: ${strip(fields.MultiLine)}</p>` : ''}
            <p>Likely To Try: ${likelyToTry}/10</p>
            `,
            browser: `${userAgent.getBrowser().name} ${userAgent.getBrowser().version}`,
            operatingSystem: `${userAgent.getOS().name} ${userAgent.getOS().version}`,
            validTest: process.env.VALID_TEST
          })
        };
        break;
      default:
        data = {
          from: 'Mue Contact Form <hello@muetab.com>',
          to: config.emails,
          subject: 'New contact response',
          html: await ejs.renderFile(__dirname + '/email.ejs', {
            content: `
            <p>Email Address: ${strip(fields.Email)}</p>
            <p>"${strip(fields.MultiLine)}"</p>
            `,
            browser: `${userAgent.getBrowser().name} ${userAgent.getBrowser().version}`,
            operatingSystem: `${userAgent.getOS().name} ${userAgent.getOS().version}`,
            validTest: process.env.VALID_TEST
          })
        };
        break;
    }

    mg.messages.create(process.env.MAILGUN_DOMAIN, data)
      .then(async () => {
        await umami.request('/', req);
        return res.redirect(303, config.redirect);
      })
      .catch(async () => {
        await umami.error('/', req, 'email-failed');
        return res.redirect(303, config.redirect);
      });
  });
}
