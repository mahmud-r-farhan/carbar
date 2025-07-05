const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendOTPEmail = async (to, otp) => {
  try {
    const mailOptions = {
      from: `"CarBar" <${process.env.EMAIL_USER}>`,
      to,
      subject: 'Your CarBar OTP Verification Code',
      html: `
        <div style="font-family:Arial, sans-serif; background-color:#f9f9f9; padding:20px;">
          <div style="max-width:600px; margin:auto; background:white; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
            <div style="background-color:#000; padding:20px; text-align:center;">
              <img src="https://res.cloudinary.com/dqovjmmlx/image/upload/v1751688877/carbar_tvqrti.png" alt="CarBar Logo" style="width:120px; height:auto;">
            </div>
            <div style="padding:30px; color:#333;">
              <h2 style="margin-top:0;">Email Verification</h2>
              <p style="font-size:16px;">Hi there,</p>
              <p style="font-size:16px;">To verify your email for <strong>CarBar</strong>, please use the following OTP code:</p>
              <div style="margin:20px 0; text-align:center;">
                <h1 style="font-size:32px; letter-spacing:5px; margin:0; color:#000;">${otp}</h1>
              </div>
              <p style="font-size:14px; color:#666;">This code is valid for the next 5 minutes. Do not share it with anyone.</p>
              <p style="font-size:14px; color:#666;">If you didn’t request this, please ignore this email.</p>
              <hr style="margin:30px 0; border:none; border-top:1px solid #eee;">
              <p style="font-size:12px; color:#aaa; text-align:center;">© ${new Date().getFullYear()} CarBar by <a href="https://devplus.fun/" target="_blank">Mahmud</a> .</p>
            </div>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`OTP email sent to ${to}`);
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error('Failed to send OTP email');
  }
};

module.exports = { sendOTPEmail };