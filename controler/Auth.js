const axios = require('axios');
const AuthData = require('../database/auth'); 
const qs = require('qs');





const CLIENT_ID = process.env.CLIENT_ID ||  '66b3a1c018907b27627d2d6f-m02uacsi';
const CLIENT_SECRET = process.env.client_secret ||  'cb07d984-84bf-47e6-a541-e46f104aea6c'
const REDIRECT_URI = process.env.REDIRECT_URI  || 'http://localhost:3000/oauth/callback';

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
            { new: true } 
        );
   


       
        return access_token;

    } catch (error) {
        console.error('Error refreshing access token:', error.response ? error.response.data : error.message);
        throw new Error('Failed to refresh access token');
    }
};

const axiosInstance = axios.create({
    httpsAgent: new (require('https')).Agent({  
        rejectUnauthorized: false 
    })
});



axiosInstance.interceptors.response.use(
    response => response,
    async error => {
        const originalRequest = error.config;
 
        if (error.response && error.response.status=== 401 && !originalRequest._retry) {
           
            originalRequest._retry = true;
            const authData = await AuthData.findOne({_id: originalRequest.params.id});
            
                console.log(authData.refreshToken,"authData.refreshToken")
            
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





module.exports = { getAuthorization, getToken, axiosInstance,  };
