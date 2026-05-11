const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const crypto = require('crypto');
const config = require('../config/environment');

const ses = new SESClient({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
});

exports.generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

exports.sendOTPEmail = async (toEmail, otp, purpose) => {
  const subjects = {
    register: 'Código de verificação — CromoSwap',
    reset_password: 'Redefinição de senha — CromoSwap',
  };

  const bodies = {
    register: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Verificação de e-mail</h2>
        <p>Use o código abaixo para concluir seu cadastro no CromoSwap:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 24px 0;">
          ${otp}
        </div>
        <p style="color: #888;">Válido por 10 minutos. Não compartilhe este código com ninguém.</p>
      </div>
    `,
    reset_password: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Redefinição de senha</h2>
        <p>Use o código abaixo para redefinir sua senha no CromoSwap:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 24px 0;">
          ${otp}
        </div>
        <p style="color: #888;">Válido por 10 minutos. Se você não solicitou isso, ignore este e-mail.</p>
      </div>
    `,
  };

  const command = new SendEmailCommand({
    Source: config.email.fromAddress,
    Destination: { ToAddresses: [toEmail] },
    Message: {
      Subject: { Data: subjects[purpose] || 'Código de verificação — CromoSwap' },
      Body: {
        Html: { Data: bodies[purpose] || bodies.register },
      },
    },
  });

  await ses.send(command);
};
