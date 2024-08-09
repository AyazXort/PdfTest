const axios = require('axios');
const AuthData = require('../database/auth'); 
const qs = require('qs');

const CLIENT_ID = '66b3a1c018907b27627d2d6f-lzk2jsw7'; 
const CLIENT_SECRET = 'c2f1eb17-bbb5-4580-a495-d439639b4bef'; 
const REDIRECT_URI = 'http://localhost:3000/oauth/callback';

const getAuthorization = async (req, res) => {
    const scopes = 'contacts.readonly'; 
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
        // const response = await axios.post('https://marketplace.gohighlevel.com/oauth/token', null, {
        //     params: {
        //         grant_type: 'authorization_code',
        //         code: authorizationCode,
        //         redirect_uri: REDIRECT_URI,
        //         client_id: CLIENT_ID,
        //         client_secret: CLIENT_SECRET,
        //     },
        //     headers: {
        //         'Content-Type': 'application/x-www-form-urlencoded'
        //     }
        // });

        // const { access_token, refresh_token } = response.data;

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
   


        console.log(access_token,"newww aceess dataaaaaaa")
       
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
            console.log(error.response.status,"error.response.status")

            if (authData && authData.refreshToken) {
                try {
                    
                    
                    const newAccessToken = await refreshAccessToken(authData.refreshToken);
                    console.log(newAccessToken, "newAccessTokennewAccessTokennewAccessToken")
                   
                    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
                    console.log(originalRequest, "originalRequest")
                    return axiosInstance(originalRequest);
                } catch (err) {
                    console.error('Failed to refresh token:', err);
                    
                }
            }
        }

        return Promise.reject(error);
    }
);

// Example usage of axiosInstance
const someApiRequest = async (req, res) => {
    console.log("heeeloo worldssss");

    try {
        const response = await axiosInstance.get('https://services.leadconnectorhq.com/contacts/', {
            headers: {
                'Authorization': `Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdXRoQ2xhc3MiOiJMb2NhdGlvbiIsImF1dGhDbGFzc0lkIjoidmNMeEJmdzAxTm12MlZubGh0TkQiLCJzb3VyY2UiOiJJTlRFR1JBVElPTiIsInNvdXJjZUlkIjoiNjZiM2ExYzAxODkwN2IyNzYyN2QyZDZmLWx6azJqc3c3IiwiY2hhbm5lbCI6Ik9BVVRIIiwicHJpbWFyeUF1dGhDbGFzc0lkIjoidmNMeEJmdzAxTm12MlZubGh0TkQiLCJvYXV0aE1ldGEiOnsic2NvcGVzIjpbImNvbnRhY3RzLnJlYWRvbmx5Il0sImNsaWVudCI6IjY2YjNhMWMwMTg5MDdiMjc2MjdkMmQ2ZiIsImNsaWVudEtleSI6IjY2YjNhMWMwMTg5MDdiMjc2MjdkMmQ2Zi1semsyanN3NyJ9LCJpYXQiOjE3MjMxNTQyNzEuNzM4LCJleHAiOjE3MjMyNDA2NzEuNzM4fQ.HCLUgdXX-N6zrAn56qf69dU7WKdlXMRx73ZSFBaS-_MDB1qZFzQ9b7NGnKa3h6VcG6tkfdRVkyntYaqC3htAgmAiSQvkswlSBYKO-zCNonS_QY3sRQ2SDJ2uT0hYpOtF0uMhOO3xVdAVGb6iiw7IhE11Fq9UJ2U1UbWY6eqyb9Ft99O46dtHWRYNxiVjMXHCnHaeClLDNQ8jzSKOgd7FQ3n73K_j-0XUenyM5a2gAzt5nyGTCpNTazGa3otLS8Y8lAKhaugCf3LvfCPUyOembccz-BZLX5wzd6Tokq5Ve_TaVuEQuWRZahWmhvG56t6RNVvrCs82_lYsgL8TLI60MguY9YGqvWiafq64KjZvtaWOPyLgEwDkBcPFxLGX9H5ENVojrW-eJ1ZgpFkJRYBhy5q8k3VK90ljd271xmJ2OH3umyrxLh-2whg9T2h_skMCqZYi0Ui5DcPHBATX3jzUDB4iJYhz3o50lsDcRS5Ys8pVMW7x8ICLMxud6p6klB5dyGTty1i4NUjKIs31T0HFm7DQD9g8H09g3or0M8sDI3MwnBOMXBk_wixeZKPMG-gwzcopcpMag5sEteCEoGRnYXIVZyZhYiFlcgSqMR3XqFZvhRwzmA_x6F3EKgo2-f6x4slj9bifFOCqL_9txLHHzbiLcm5O8Lybg0x-at5Evsk`,
                'Version': '2021-07-28',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
            },
            params: {
                locationId: 'vcLxBfw01Nmv2VnlhtND',
                limit: 20
            }
        });

        // Access the data directly from response.data
        const data = response;
      


        console.log(data, "data")
    } catch (error) {
        console.error("Error making API request:", error);
    }
};

module.exports = { getAuthorization, getToken, axiosInstance, someApiRequest };
