const handleForm = require('../util/handleForm');
const umami = require('../util/umami');
const config = require('../config.json');

module.exports = async (req, res) => {
  if (!req.query.form) {
    await umami.error('/', req, 'invalid-type');
    return res.redirect(303, config.redirect);
  }

  const forms = ['contact', 'uninstall'];
  if (!forms.includes(req.query.form)) { 
    await umami.error('/', req, 'invalid-type');
    return res.redirect(303, config.redirect);
  } else {
    await handleForm(req, res);
  }
}
