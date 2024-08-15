

const PDFDocument = require("pdfkit");
const { PassThrough } = require("stream");
const FormData = require('form-data')
const axios = require('axios');

const {axiosInstance} = require('../controler/Auth')


const downloadImage = async (url) => {
  try {
      const response = await axios({
          url: url,
          method: 'GET',
          responseType: 'arraybuffer' 
      });
      return Buffer.from(response.data); 
  } catch (error) {
      throw new Error(`Failed to download image. Error: ${error.message}`);
  }
};


const generatePDF = async (contactDetails) => {
  const { firstName, email, lastName, country, customFields } = contactDetails;
console.log(customFields,"customFields")
  const urlObject = customFields.find(item => item.id === 'QzqFF3DIKd9TYlEbH1FW');
  const url = urlObject ? urlObject.value.url : null;

  const imageBuffer = await downloadImage(url);

  const doc = new PDFDocument();
  const chunks = [];
  const stream = new PassThrough();

  doc.pipe(stream);
  doc.image(imageBuffer, {
      fit: [300, 450], 
      align: 'center',
      valign: 'center'
  });

  console.log(url,"url")

  doc.fontSize(25).text("Contact Details:", 100, 100);
  doc.fontSize(15).text(`Name: ${firstName}`, 100, 150);
  doc.text(`Email: ${email}`, 100, 180);
  doc.text(`Country: ${country}`, 100, 210);
  doc.text(`Last Name: ${lastName}`, 100, 240);
  

  doc.end();

  return new Promise((resolve, reject) => {
      stream.on('data', chunk => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
  });
};

const uploadPDF = async (locationId, pdfData, additionalParams={}) => {
  const url = `https://services.leadconnectorhq.com/locations/${locationId}/customFields/upload`; 
  const token = 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdXRoQ2xhc3MiOiJMb2NhdGlvbiIsImF1dGhDbGFzc0lkIjoidmNMeEJmdzAxTm12MlZubGh0TkQiLCJzb3VyY2UiOiJJTlRFR1JBVElPTiIsInNvdXJjZUlkIjoiNjZiM2ExYzAxODkwN2IyNzYyN2QyZDZmLWx6azJqc3c3IiwiY2hhbm5lbCI6Ik9BVVRIIiwicHJpbWFyeUF1dGhDbGFzc0lkIjoidmNMeEJmdzAxTm12MlZubGh0TkQiLCJvYXV0aE1ldGEiOnsic2NvcGVzIjpbImNvbnRhY3RzLnJlYWRvbmx5IiwiY29udGFjdHMucmVhZG9ubHkiLCJjb250YWN0cy53cml0ZSIsImxvY2F0aW9ucy9jdXN0b21GaWVsZHMud3JpdGUiLCJsb2NhdGlvbnMvY3VzdG9tRmllbGRzLnJlYWRvbmx5Il0sImNsaWVudCI6IjY2YjNhMWMwMTg5MDdiMjc2MjdkMmQ2ZiIsImNsaWVudEtleSI6IjY2YjNhMWMwMTg5MDdiMjc2MjdkMmQ2Zi1semsyanN3NyJ9LCJpYXQiOjE3MjM0OTM3NTIuMjgzLCJleHAiOjE3MjM1ODAxNTIuMjgzfQ.PGo4gFSl2pvCsMqqfzebkKvG_cq0DXFFVijTDJSxE71hf4E7C2XXoKcA8jdVp3Jn4HH0FIOKtG9KloJslUQ1GmihRsV0ZbEulIidClpq9B5FDGW9HfL67nUnh-GCSjrytPzpMHNVIkjx5Out03o_tMpIYalABhJVIUSeMsCH6yrbL8PWY1v4wZfsLvKqW_dNR81rSUSncY-IGuscmWo-Wvn2hGLGWp60GenB6-uiGlgAcjzat0KtBuHmVzfcLc0AHq6UW34xkzp85uEnru2pvntE8gY08MQ8HPyblywzhlVcBlB6II0XHBS90i7Yy5iuer6oEkQv5YRjrvNk7VDrKOEQ4WXAcDkca-5cVXlkxXtyJ5-ok1U4hXyJT63ssWj70JV3iNtvTZjcKImcCkqBk6ZsLOjNM7v2e-4t8KYO_h7Vyppl76-itYiJEz7CvzKHyfUAOP_U6fMv_ythPZKRWPxik26fstFqZuWx2wYc_2z73QkcQrMcqBQWtMW-tNnE1FgsevGIzPLLIj7Z4pn6uEIM60NeVONm8h8zPBWtaPMwECMEmhTs0OptFPpB7rDcrbrnIwXy80XwZyR6tkkHElYg1wJIT_TJBTG8Y8NPrq4bnktzqU96Mx4vLuVt3mwSkUrAW3SYNZV4DWA0QbXJl6vDxjByL85ZnMSEvF42S90'; 
  const version = '2021-07-28';
  
  if (!Buffer.isBuffer(pdfData)) {
      throw new Error('pdfData must be a Buffer');
  }
  const form = new FormData();

  form.append('file', pdfData, {
      filename: 'file.pdf',
      contentType: 'application/pdf'
  });

  for (const [key, value] of Object.entries(additionalParams)) {
      form.append(key, value);
  }
  try {
      const response = await axios.post(url, form, {
          headers: {
              ...form.getHeaders(),
              'Authorization': token,
              'Version': version
          }
      });
      return response.data;
  } catch (error) {
      console.error('Error uploading PDF:', error.response ? error.response.data : error.message);
      throw error;
  }
};

const getPDF = async (req, res) => {


  const locaionId = "vcLxBfw01Nmv2VnlhtND"

  try {
      const response = await axiosInstance.get(`https://services.leadconnectorhq.com/contacts/mi4jD7brRKuiSzwA1A0A`, {
          headers: {
              'Authorization': `Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdXRoQ2xhc3MiOiJMb2NhdGlvbiIsImF1dGhDbGFzc0lkIjoidmNMeEJmdzAxTm12MlZubGh0TkQiLCJzb3VyY2UiOiJJTlRFR1JBVElPTiIsInNvdXJjZUlkIjoiNjZiM2ExYzAxODkwN2IyNzYyN2QyZDZmLWx6azJqc3c3IiwiY2hhbm5lbCI6Ik9BVVRIIiwicHJpbWFyeUF1dGhDbGFzc0lkIjoidmNMeEJmdzAxTm12MlZubGh0TkQiLCJvYXV0aE1ldGEiOnsic2NvcGVzIjpbImNvbnRhY3RzLnJlYWRvbmx5IiwiY29udGFjdHMucmVhZG9ubHkiLCJjb250YWN0cy53cml0ZSIsImxvY2F0aW9ucy9jdXN0b21GaWVsZHMud3JpdGUiLCJsb2NhdGlvbnMvY3VzdG9tRmllbGRzLnJlYWRvbmx5Il0sImNsaWVudCI6IjY2YjNhMWMwMTg5MDdiMjc2MjdkMmQ2ZiIsImNsaWVudEtleSI6IjY2YjNhMWMwMTg5MDdiMjc2MjdkMmQ2Zi1semsyanN3NyJ9LCJpYXQiOjE3MjM0OTM3NTIuMjgzLCJleHAiOjE3MjM1ODAxNTIuMjgzfQ.PGo4gFSl2pvCsMqqfzebkKvG_cq0DXFFVijTDJSxE71hf4E7C2XXoKcA8jdVp3Jn4HH0FIOKtG9KloJslUQ1GmihRsV0ZbEulIidClpq9B5FDGW9HfL67nUnh-GCSjrytPzpMHNVIkjx5Out03o_tMpIYalABhJVIUSeMsCH6yrbL8PWY1v4wZfsLvKqW_dNR81rSUSncY-IGuscmWo-Wvn2hGLGWp60GenB6-uiGlgAcjzat0KtBuHmVzfcLc0AHq6UW34xkzp85uEnru2pvntE8gY08MQ8HPyblywzhlVcBlB6II0XHBS90i7Yy5iuer6oEkQv5YRjrvNk7VDrKOEQ4WXAcDkca-5cVXlkxXtyJ5-ok1U4hXyJT63ssWj70JV3iNtvTZjcKImcCkqBk6ZsLOjNM7v2e-4t8KYO_h7Vyppl76-itYiJEz7CvzKHyfUAOP_U6fMv_ythPZKRWPxik26fstFqZuWx2wYc_2z73QkcQrMcqBQWtMW-tNnE1FgsevGIzPLLIj7Z4pn6uEIM60NeVONm8h8zPBWtaPMwECMEmhTs0OptFPpB7rDcrbrnIwXy80XwZyR6tkkHElYg1wJIT_TJBTG8Y8NPrq4bnktzqU96Mx4vLuVt3mwSkUrAW3SYNZV4DWA0QbXJl6vDxjByL85ZnMSEvF42S90`,
              'Version': '2021-07-28',
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept': 'application/json',
          },
          params: {
              locationId: locaionId,
              id : "66ba5e5ef071e58d781ac09f",
              limit: 20
          }
      });


 const contactDetails = response.data.contact;
 


 const pdfData = await generatePDF(contactDetails);


 const additionalParams = {
  id: 'BaN2668s5OUtEQ0Ue4kO', 
  maxFiles: '1'
};
 const updateResponse = await uploadPDF(locaionId, pdfData,additionalParams);


console.log(updateResponse,"updateResponse")
 res.status(200).json(updateResponse);

} catch (error) {
 console.error("Error:", error);
 res.status(500).json({ error: 'An error occurred' });
}

     
  
};


module.exports = { getPDF };
