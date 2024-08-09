const axios = require('axios');
const AuthData = require('../database/auth'); 
const qs = require('qs');
const PDFDocument = require("pdfkit");
const { PassThrough } = require("stream");
const request = require('request');

const CLIENT_ID = '66b3a1c018907b27627d2d6f-lzk2jsw7'; 
const CLIENT_SECRET = 'c2f1eb17-bbb5-4580-a495-d439639b4bef'; 
const REDIRECT_URI = 'http://localhost:3000/oauth/callback';

const getAuthorization = async (req, res) => {
    const scopes = 'contacts.readonly contacts.readonly contacts.write locations/customFields.write locations/customFields.readonly'; 
    const authURL = `https://marketplace.leadconnectorhq.com/oauth/chooselocation?response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&client_id=${CLIENT_ID}&scope=${scopes}`;

    console.log('Authorization URL:', authURL);
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

// Function to refresh the access token
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
            const authData = await AuthData.findOne(); 
          

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


const generatePDF = (contactDetails) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument();
        const stream = new PassThrough();

        doc.pipe(stream);

        doc.fontSize(25).text("Contact Details:", 100, 100);
        const { firstName, email, lastName, country } = contactDetails;

        doc.fontSize(15).text(`Name: ${firstName}`, 100, 150);
        doc.text(`Email: ${email}`, 100, 180);
        doc.text(`Country: ${country}`, 100, 210); // Adjusted for spacing
        doc.text(`Last Name: ${lastName}`, 100, 240); // Adjusted for spacing

        doc.end();

        // Collect PDF data
        const chunks = [];
        stream.on('data', chunk => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
    });
};

const updateContact = async (contactId, contactDetails, pdfData) => {
    const options = {
        method: 'PUT',
        url: `https://services.leadconnectorhq.com/contacts/${contactId}`,
        headers: {
            Authorization: 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdXRoQ2xhc3MiOiJMb2NhdGlvbiIsImF1dGhDbGFzc0lkIjoidmNMeEJmdzAxTm12MlZubGh0TkQiLCJzb3VyY2UiOiJJTlRFR1JBVElPTiIsInNvdXJjZUlkIjoiNjZiM2ExYzAxODkwN2IyNzYyN2QyZDZmLWx6azJqc3c3IiwiY2hhbm5lbCI6Ik9BVVRIIiwicHJpbWFyeUF1dGhDbGFzc0lkIjoidmNMeEJmdzAxTm12MlZubGh0TkQiLCJvYXV0aE1ldGEiOnsic2NvcGVzIjpbImNvbnRhY3RzLnJlYWRvbmx5IiwiY29udGFjdHMucmVhZG9ubHkiLCJjb250YWN0cy53cml0ZSIsImxvY2F0aW9ucy9jdXN0b21GaWVsZHMud3JpdGUiLCJsb2NhdGlvbnMvY3VzdG9tRmllbGRzLnJlYWRvbmx5Il0sImNsaWVudCI6IjY2YjNhMWMwMTg5MDdiMjc2MjdkMmQ2ZiIsImNsaWVudEtleSI6IjY2YjNhMWMwMTg5MDdiMjc2MjdkMmQ2Zi1semsyanN3NyJ9LCJpYXQiOjE3MjMyNDM3MDkuNjc0LCJleHAiOjE3MjMzMzAxMDkuNjc0fQ.hu1ODi4xh8yuNTeu1Rs82tDtZQKudvs56IKx7RjK5WNxBa25TaoFNsbLnL6EpXYmonKaTerTxgQhK1HP9XKSmzmWqNFNl1MIp1Jo1nhAKJYE0IsnQ2Gj_eaqHihBXL_MeVqXVkRNXguHy0bG9XbuWcHhV4RSgNHDXUcLIXTaSGwmItJMSxl92fHdy4m6YpF5om3w4NcNX0qkPODjH6Lt1SvGz1iNq-dBl9pU1HUU3uudKUeRUId5SxUIsDqZomvPSrgNDNM0jzBXdD1_XQdq_H76GfHXXfmtGxohQG09X7B5L84TqN7zAJ0HghaSPA-9DICUbyCsO2wxMrjPfCVxaxuw9l1mgWluRC9omiF6HMYEx55nSYI1SC94mwHYJH48dsQ-fMV7Bm5fzWHRxXxW6mBtPk76CJ7kO92OLn52t1TWeLdvdV4cmzcmDJV1fCkICtyDUAehZZ9O_zxTpalvDdD-BF8sfCMXxLXwJ5cszs-uX3cqxeVqj2LGZd_O3vzKRNLBT-Bk16R67e9MsdEAXABTyg65XzjIf2cYa8Loo4CMmX4uqHl6OwzuwVDMZTnyoHbqhAhlCDkHGzTzxmFJN7RDDaDJyRGjEdxoU6Qgr9gxhhkU5lQ0mCpI3YtRmfC8w2DaoTuA9azL-DapVqy_uKPE02PKhcrGiz8_hPRRqv8',
            "Version": '2021-07-28',
            'Content-Type': 'application/json',
            "Accept": 'application/json'
        },
        body: JSON.stringify({
          
            customFields: [
                {
                    // id: '6dvNaf7VhkQ9snc5vnjJ', 
                    key: 'pdf_gen', 
                    field_value: pdfData.toString('base64') 
                }
            ]
        })
    };

    return new Promise((resolve, reject) => {
        request(options, (error, response, body) => {
            if (error) {
                return reject(error);
            }
            try {
                const parsedBody = JSON.parse(body);
                resolve(parsedBody);
            } catch (e) {
                reject(new Error(`Failed to parse response: ${e.message}`));
            }
        });
    });
};

const someApiRequest = async (req, res) => {
    console.log("heeeloo worldssss");
    const authData = await AuthData.findOne(); 

    try {
        const response = await axiosInstance.get(`https://services.leadconnectorhq.com/contacts/BaN2668s5OUtEQ0Ue4kO`, {
            headers: {
                'Authorization': `Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdXRoQ2xhc3MiOiJMb2NhdGlvbiIsImF1dGhDbGFzc0lkIjoidmNMeEJmdzAxTm12MlZubGh0TkQiLCJzb3VyY2UiOiJJTlRFR1JBVElPTiIsInNvdXJjZUlkIjoiNjZiM2ExYzAxODkwN2IyNzYyN2QyZDZmLWx6azJqc3c3IiwiY2hhbm5lbCI6Ik9BVVRIIiwicHJpbWFyeUF1dGhDbGFzc0lkIjoidmNMeEJmdzAxTm12MlZubGh0TkQiLCJvYXV0aE1ldGEiOnsic2NvcGVzIjpbImNvbnRhY3RzLnJlYWRvbmx5IiwiY29udGFjdHMucmVhZG9ubHkiLCJjb250YWN0cy53cml0ZSIsImxvY2F0aW9ucy9jdXN0b21GaWVsZHMud3JpdGUiLCJsb2NhdGlvbnMvY3VzdG9tRmllbGRzLnJlYWRvbmx5Il0sImNsaWVudCI6IjY2YjNhMWMwMTg5MDdiMjc2MjdkMmQ2ZiIsImNsaWVudEtleSI6IjY2YjNhMWMwMTg5MDdiMjc2MjdkMmQ2Zi1semsyanN3NyJ9LCJpYXQiOjE3MjMyNDM3MDkuNjc0LCJleHAiOjE3MjMzMzAxMDkuNjc0fQ.hu1ODi4xh8yuNTeu1Rs82tDtZQKudvs56IKx7RjK5WNxBa25TaoFNsbLnL6EpXYmonKaTerTxgQhK1HP9XKSmzmWqNFNl1MIp1Jo1nhAKJYE0IsnQ2Gj_eaqHihBXL_MeVqXVkRNXguHy0bG9XbuWcHhV4RSgNHDXUcLIXTaSGwmItJMSxl92fHdy4m6YpF5om3w4NcNX0qkPODjH6Lt1SvGz1iNq-dBl9pU1HUU3uudKUeRUId5SxUIsDqZomvPSrgNDNM0jzBXdD1_XQdq_H76GfHXXfmtGxohQG09X7B5L84TqN7zAJ0HghaSPA-9DICUbyCsO2wxMrjPfCVxaxuw9l1mgWluRC9omiF6HMYEx55nSYI1SC94mwHYJH48dsQ-fMV7Bm5fzWHRxXxW6mBtPk76CJ7kO92OLn52t1TWeLdvdV4cmzcmDJV1fCkICtyDUAehZZ9O_zxTpalvDdD-BF8sfCMXxLXwJ5cszs-uX3cqxeVqj2LGZd_O3vzKRNLBT-Bk16R67e9MsdEAXABTyg65XzjIf2cYa8Loo4CMmX4uqHl6OwzuwVDMZTnyoHbqhAhlCDkHGzTzxmFJN7RDDaDJyRGjEdxoU6Qgr9gxhhkU5lQ0mCpI3YtRmfC8w2DaoTuA9azL-DapVqy_uKPE02PKhcrGiz8_hPRRqv8`,
                'Version': '2021-07-28',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
            },
            params: {
                locationId: 'vcLxBfw01Nmv2VnlhtND',
                limit: 20
            }
        });
   console.log(response, "response")

   const contactDetails = response.data.contact;

   // Generate PDF
   const pdfData = await generatePDF(contactDetails);

   // Update Contact with PDF as a custom field
   const contactId = 'BaN2668s5OUtEQ0Ue4kO'; // replace with actual contactId
   const updateResponse = await updateContact(contactId, contactDetails, pdfData);

   console.log('Update response:', updateResponse);

   res.status(200).json(updateResponse);

} catch (error) {
   console.error("Error:", error);
   res.status(500).json({ error: 'An error occurred' });
}

       
    
};

module.exports = { getAuthorization, getToken, axiosInstance, someApiRequest };
