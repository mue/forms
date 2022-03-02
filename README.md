# forms
Forms backend for the Mue website

## Installation
### Requirements
* A free [Mailgun](https://www.mailgun.com/) account
* A free [Vercel](https://vercel.com/) account
* A free [hCaptcha](https://www.hcaptcha.com/) account
* [Git](https://git-scm.com/)
* [Node.js](https://nodejs.org/)
### Starting
1. Clone the repository using ``git clone https://github.com/mue/forms.git``
2. Run ``yarn`` or ``npm i`` to install all needed dependencies
3. Install Vercel CLI with ``npm i -g vercel`` or ``yarn add global vercel``
4. Change the email and redirect in config.json to your own for testing and optionally change the ratelimit info
5. Set the environment variables for "MAILGUN_KEY", "MAILGUN_DOMAIN" and "HCAPTCHA_SECRET". These can be found in the various admin dashboards of the services. Also set "VALID_TEST" to any message you want, this will appear in the email so you know it's legitimately sent from your contact form
6. Sign in and setup Vercel CLI with ``vercel dev``. Use this command to start the server also

## License
Form Code - [MIT](LICENSE)

Email Template [MIT](views/LICENSE) (By Wildbit & Canvas)
