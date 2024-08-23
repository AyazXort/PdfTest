const axios = require('axios');
const AuthData = require('../database/auth'); 
const qs = require('qs');
const https = require('https')





const CLIENT_ID ='66c7bfdb9e13dbe9f0df8f79-m05vi8g7';
const CLIENT_SECRET ='08325f4b-00bf-4da8-b719-364743c2ea56'
const REDIRECT_URI = 'http://localhost:3000/oauth/callback';

const getAuthorization = async (req, res) => {
    const scopes = 'contacts.readonly contacts.write'; 
    const authURL = `https://marketplace.leadconnectorhq.com/oauth/chooselocation?response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&client_id=${CLIENT_ID}&scope=${scopes}`;

  
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
        // console.log(response, "response")

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
        console.log(authData, "response")
        res.send(authData);
    } catch (error) {
        console.error('Error exchanging code for tokens:', error.response ? error.response.data : error.message);
        res.status(500).send('Error exchanging code for tokens');
    }
};


const refreshAccessToken = async (refreshToken) => {

     
    console.log(refreshToken, "refreshToken")
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
            { new: true } 
        );
   


       
        return access_token;

    } catch (error) {
        console.error('Error refreshing access token:', error.response ? error.response.data : error.message);
        throw new Error('Failed to refresh access token');
    }
};
// const agent = new https.Agent({  
//     rejectUnauthorized: false
//   });
const axiosInstance = axios.create({
    baseURL: 'https://services.leadconnectorhq.com',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  axiosInstance.interceptors.request.use(
    config => {
      const authData = AuthData.findOne(); // Or however you retrieve the current auth data
      if (authData && authData.accessToken) {
        config.headers.Authorization = `Bearer ${authData.accessToken}`;
      }
      return config;
    },
    error => Promise.reject(error)
  );


  axiosInstance.interceptors.response.use(
    response => response,
    async error => {
      const originalRequest = error.config;
  
      if (error.response && error.response.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
  
        const authData = await AuthData.findOne({_id:originalRequest.params.id}); // Fetch the auth data
  console.log(authData,"authData")
        if (authData && authData.refreshToken) {
          try {
            const newAccessToken = await refreshAccessToken(authData.refreshToken);
            axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
  
            // Update the original request with the new token
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return axiosInstance(originalRequest);
          } catch (err) {
            console.error('Failed to refresh token:', err);
            // Handle token refresh failure
            // Possibly redirect to login or clear stored tokens
          }
        }
      }
  
      return Promise.reject(error);
    }
  );





module.exports = { getAuthorization, getToken,  axiosInstance};
