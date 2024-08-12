const axios = require('axios');
const AuthData = require('../database/auth'); 
const qs = require('qs');
const https = require('https')
const PDFDocument = require("pdfkit");
const { PassThrough } = require("stream");
const FormData = require('form-data')
const Tesseract = require('tesseract.js');
const sharp = require('sharp');

const fs = require('fs');
const request = require('request');

const CLIENT_ID = '66b3a1c018907b27627d2d6f-lzk2jsw7'; 
const CLIENT_SECRET = 'c2f1eb17-bbb5-4580-a495-d439639b4bef'; 
const REDIRECT_URI = 'http://localhost:3000/oauth/callback';

const getAuthorization = async (req, res) => {
    const scopes = 'contacts.readonly contacts.readonly contacts.write locations/customFields.write locations/customFields.readonly'; 
    const authURL = `https://marketplace.leadconnectorhq.com/oauth/chooselocation?response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&client_id=${CLIENT_ID}&scope=${scopes}`;

  
    res.redirect(authURL);
};


const getToken = async (req, res) => {
    const authorizationCode = req.query.code;

    if (!authorizationCode) {
        return res.status(400).send('Authorization code is missing');
    }

    try {
        const response = await axios.post('https://marketplace.gohighlevel.com/oauth/token', null, {
            params: {
                grant_type: 'authorization_code',
                code: authorizationCode,
                redirect_uri: REDIRECT_URI,
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
            },
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const { access_token, refresh_token } = response.data;

        const targetResponse = await axios.post('https://services.leadconnectorhq.com/oauth/token', new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            grant_type: 'authorization_code',
            code: authorizationCode,
            redirect_uri: REDIRECT_URI
        }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const { access_token: newAccessToken, refresh_token: newRefreshToken, locationId: newLocationId, companyId: newCompanyId } = targetResponse.data;



        const authData = new AuthData({
            companyId: newCompanyId,
            location: newLocationId,
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        });

        await authData.save();
        res.send(authData);
    } catch (error) {
        console.error('Error exchanging code for tokens:', error.response ? error.response.data : error.message);
        res.status(500).send('Error exchanging code for tokens');
    }
};


const refreshAccessToken = async (refreshToken) => {
    try {
        const response = await axios.post('https://services.leadconnectorhq.com/oauth/token', qs.stringify({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
        }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                
            }
        });

      

        const { access_token, refresh_token } = response.data;
        

        await AuthData.findOneAndUpdate(
            { refreshToken: refreshToken },
            { accessToken: access_token, refreshToken: refresh_token },
            { new: true } // Return the updated document
        );
   


       
        return access_token;

    } catch (error) {
        console.error('Error refreshing access token:', error.response ? error.response.data : error.message);
        throw new Error('Failed to refresh access token');
    }
};

const axiosInstance = axios.create();



axiosInstance.interceptors.response.use(
    response => response,
    async error => {
        const originalRequest = error.config;
 
        if (error.response.status === 401 && !originalRequest._retry) {
           
            originalRequest._retry = true;
            const authData = await AuthData.findOne({_id: originalRequest.params.id});
            
      

            if (authData && authData.refreshToken) {
                try {
                    
                    
                    const newAccessToken = await refreshAccessToken(authData.refreshToken);
                   
                   
                    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
            
                    return axiosInstance(originalRequest);
                } catch (err) {
                    console.error('Failed to refresh token:', err);
                    
                }
            }
        }

        return Promise.reject(error);
    }
);


// const downloadImage = async (url) => {
//     try {
//         const response = await axios({
//             url: url,
//             method: 'GET',
//             responseType: 'arraybuffer',
//             maxRedirects: 5
//         });
//         return Buffer.from(response.data);
//     } catch (error) {
//         throw new Error(`Failed to get image. Error: ${error.message}`);
//     }
// };

// // Extract text from image buffer with pre-processing
// const extractTextFromImage = async (imageBuffer) => {
//     try {
//         const processedBuffer = await sharp(imageBuffer)
//             .resize(1024) // Resize if needed
//             .greyscale() // Convert to greyscale to improve OCR results
//             .toBuffer();
        
//         const { data: { text } } = await Tesseract.recognize(processedBuffer, 'eng', {
//             logger: info => console.log(info)
//         });
//         return text;
//     } catch (error) {
//         throw new Error(`Error processing image: ${error.message}`);
//     }
// };

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
const resizeImage = async (imageBuffer) => {
    return sharp(imageBuffer)
        .resize(100)
        .toBuffer();
};


const generatePDF = async (contactDetails) => {
    const { firstName, email, lastName, country, customFields } = contactDetails;
    const urlObject = customFields.find(item => item.id === 'QzqFF3DIKd9TYlEbH1FW');
    const url = urlObject ? urlObject.value.url : null;

    const imageBuffer = await downloadImage(url);
    const resizedImageBuffer = await resizeImage(imageBuffer);
    const doc = new PDFDocument();
    const chunks = [];
    const stream = new PassThrough();
    console.log(url,"url")
    doc.pipe(stream);
    doc.image(resizedImageBuffer, {
        fit: [300, 300], 
        align: 'center',
        valign: 'center'
    });

    

    doc.fontSize(25).text("Contact Details:", 100, 100);
    doc.fontSize(15).text(`Name: ${firstName}`, 100, 150);
    doc.text(`Email: ${email}`, 100, 180);
    doc.text(`Country: ${country}`, 100, 210);
    doc.text(`Last Name: ${lastName}`, 100, 240);
    // doc.text(`Extracted Text: ${extractedText}`, 100, 270);

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

const someApiRequest = async (req, res) => {
 
    const authData = await AuthData.findOne(); 
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

   const contactId = 'BaN2668s5OUtEQ0Ue4kO'; 
   const additionalParams = {
    id: 'BaN2668s5OUtEQ0Ue4kO', 
    maxFiles: '1'
};
   const updateResponse = await uploadPDF(locaionId, pdfData,additionalParams);



   res.status(200).json(updateResponse);

} catch (error) {
   console.error("Error:", error);
   res.status(500).json({ error: 'An error occurred' });
}

       
    
};

module.exports = { getAuthorization, getToken, axiosInstance, someApiRequest };
