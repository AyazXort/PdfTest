

const PDFDocument = require("pdfkit");
const { PassThrough } = require("stream");

const getContact = (req, res) => {
  const doc = new PDFDocument();

  const stream = new PassThrough();

  doc.pipe(stream);

  doc.fontSize(25).text("Contact Details:", 100, 100);

  const {
    address1,
    city,
    companyName,
    country,
    dateAdded,
    dateOfBirth,
    email,
    name,
    firstName,
    lastName,
    phone,
    postalCode,
    state,
    website,
  } = req.body;

  doc.fontSize(15).text(`Name: ${name}`, 100, 150);
  doc.text(`Email: ${email}`, 100, 180);
  doc.text(`Phone: ${phone}`, 100, 210);
  doc.text(`address1: ${address1}`, 100, 230);
  doc.text(`city: ${city}`, 100, 250);
  doc.text(`companyName: ${companyName}`, 100, 270);
  doc.text(`country: ${country}`, 100, 290);
  doc.text(`dateAdded: ${dateAdded}`, 100, 310);
  doc.text(`dateOfBirth: ${dateOfBirth}`, 100, 330);
  doc.text(`firstName: ${firstName}`, 100, 350);
  doc.text(`lastName: ${lastName}`, 100, 370);
  doc.text(`postalCode: ${postalCode}`, 100, 390);
  doc.text(`state: ${state}`, 100, 410);
  doc.text(`website: ${website}`, 100, 430);
  doc.text(`Phone: ${phone}`, 100, 450);

  doc.end();

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="contact-details.pdf"'
  );

  stream.pipe(res);
};

module.exports = { getContact };
