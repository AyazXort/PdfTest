

const PDFDocument = require("pdfkit");
const { PassThrough } = require("stream");
const FormData = require('form-data')
const axios = require('axios');

const { axiosInstance } = require('./Auth')


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
    console.log(customFields, "customFields")
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

    console.log(url, "url")

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

const uploadPDF = async (locationId, pdfData, additionalParams = {}) => {
    const url = `https://services.leadconnectorhq.com/locations/${locationId}/customFields/upload`;
    const token = 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdXRoQ2xhc3MiOiJMb2NhdGlvbiIsImF1dGhDbGFzc0lkIjoidmNMeEJmdzAxTm12MlZubGh0TkQiLCJzb3VyY2UiOiJJTlRFR1JBVElPTiIsInNvdXJjZUlkIjoiNjZiM2ExYzAxODkwN2IyNzYyN2QyZDZmLWx6azJqc3c3IiwiY2hhbm5lbCI6Ik9BVVRIIiwicHJpbWFyeUF1dGhDbGFzc0lkIjoidmNMeEJmdzAxTm12MlZubGh0TkQiLCJvYXV0aE1ldGEiOnsic2NvcGVzIjpbImNvbnRhY3RzLnJlYWRvbmx5IiwiY29udGFjdHMucmVhZG9ubHkiLCJjb250YWN0cy53cml0ZSIsImxvY2F0aW9ucy9jdXN0b21GaWVsZHMud3JpdGUiLCJsb2NhdGlvbnMvY3VzdG9tRmllbGRzLnJlYWRvbmx5Il0sImNsaWVudCI6IjY2YjNhMWMwMTg5MDdiMjc2MjdkMmQ2ZiIsImNsaWVudEtleSI6IjY2YjNhMWMwMTg5MDdiMjc2MjdkMmQ2Zi1semsyanN3NyJ9LCJpYXQiOjE3MjM3Mzg2ODYuNjE1LCJleHAiOjE3MjM4MjUwODYuNjE1fQ.Nb5ZjZyPCglOG8BHwpPc43Kb0BYdA7ddVbHmP0wNmgjBWv5p1pbMfWbgaH8tBoROExX_32YJPg6VW8MD6i5-91LrWiPBKRkW0Ev2Pc27m68Q8uLk29-xjMI5uhArUq7LC9TmvsniCQU-qP-n0yo5hvIG3h6r4z3yRPX3Tmrd2CgQKNzx6eXgRZgPXzqrt36HPU4l702z5SATulfhTDdIYysQCBX7avrjnWnvFFHtlMkkaeHsWWHuF_Tl7S63XHaHab6NTVJvq836vKF-kp-sHodWmeLW8OyofUqjyvtwBJpJNHdRNP5a42iJtaLB8UGCNC7doomiiMERlqmltIffo8dlMc4HaiJDcTZyI137AMK0v1Vf4CertDdj4tyZsEtXnF7IT6tVrVZdu5eDetbu0TfVfR8ZLgo2PrmBXN-Imy2kUsxGCvS7Y9pfkjwXuEmy-uv-CXLRbgpROz-iFfIbo3lEEOyShXYoHpIH8XpL6QWRuP1n5HKDnDyjyJnfDPGB8FIGiYV7_axQzfIexYmvHuKb1ikGpG1CNAH8D6La7V3kDajQsqzNmRVDMrWoVgZgVqBuZx_Bf3XUOV_pQqy2wEGSyFVmaSFOEaQ1xDzHAV9wVFgxncJTwrEFYpHMHDsrwPy7-tvl5BcPgWHpxTH1roUbq32gtxu8dC2gpt6aK74';
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

    // const {authorization} = req.headers
    // console.log(req.headers)
    // console.log(authorization)

    // console.log(req.headers, "requesttt")
    // const headers = req.headers
    console.log(req.headers)
    try {
        const response = await axiosInstance.get(`https://services.leadconnectorhq.com/contacts/`, {
            headers: {
                "Authorization": "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdXRoQ2xhc3MiOiJMb2NhdGlvbiIsImF1dGhDbGFzc0lkIjoidmNMeEJmdzAxTm12MlZubGh0TkQiLCJzb3VyY2UiOiJJTlRFR1JBVElPTiIsInNvdXJjZUlkIjoiNjZjN2JmZGI5ZTEzZGJlOWYwZGY4Zjc5LW0wNXZpOGc3IiwiY2hhbm5lbCI6Ik9BVVRIIiwicHJpbWFyeUF1dGhDbGFzc0lkIjoidmNMeEJmdzAxTm12MlZubGh0TkQiLCJvYXV0aE1ldGEiOnsic2NvcGVzIjpbImNvbnRhY3RzLnJlYWRvbmx5IiwiY29udGFjdHMud3JpdGUiXSwiY2xpZW50IjoiNjZjN2JmZGI5ZTEzZGJlOWYwZGY4Zjc5IiwiY2xpZW50S2V5IjoiNjZjN2JmZGI5ZTEzZGJlOWYwZGY4Zjc5LW0wNXZpOGc3In0sImlhdCI6MTcyNDM2ODIzOS44NzMsImV4cCI6MTcyNDQ1NDYzOS44NzN9.Vu0PEpxpEwYgOAMujS-Yme7lVniBejRYXH-LdcpZKsxkyGbLbsTOnEZGNdtX1wxJbf_4VFIvbbzEn1sUbobCSE_lwla0QeI4QPKbMg_IhPU6sGoc9zdtxfjMxS3p9BW61p_jVY0y89APdNd9aegwf4uRgyKbsnis610X4_J54kUrF-cuX3UoUy97UC3p7Ro3ZaKXbUQVEl-HTxzA5J8Ax-5sNBy1jLwczy9rGh9HcB8P-VsmmHLhMtsw2dFl3qXN44QaaUrMn9TMK4JKCyZ5SpiIo-VafTWmx3AecrIK9l_BmOkrvXOm9G6tmTPbj1FxmukkwQb0r7nWxQxlUWD9zRb4-0g3fSiD0ccvyN_c833q4UEfMOjBg5fKVGqDr-dy3iixtq8XcD3LjT2t02TxIzltkt7MXBG7ydWM8vSdv5XTfX_kyfN-_REsWYUCFV2HObfWnqNCTv_Yf0fN6EjvnLY1oUIsDNfJ2dRDx6ozpTH3bH4PonH21RzfW9gaKS7zJne6XTCIV6Ix2pdHqjcFMfs86vIczXQlutwg8jGZ62bdgYj5bju8zHpNxs1C_0g73tgM6sbSYWB36C0bNZdpGCinycras2TH9wXC7pfHyBcJjlboY9KmXcO3PI0gtmtnPZLvR9vlBDHAX1SGQigHzUdwiQPiRtnULoK_bfUhS1o",
                "Version": "2021-07-28",
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json"
            },
            params: {
                locationId: "vcLxBfw01Nmv2VnlhtND",
                  id : "66c7c5703f9a94efbb32423c",
                limit: 20
            }
        });
        console.log(response, "responseee")

        //  const contactDetails = response.data.contact;



        //  const pdfData = await generatePDF(contactDetails);


        //  const additionalParams = {
        //   id: 'BaN2668s5OUtEQ0Ue4kO', 
        //   maxFiles: '1'
        // };
        //  const updateResponse = await uploadPDF(locaionId, pdfData,additionalParams);


        // console.log(updateResponse.uploadedFiles,"updateResponse")
        //  pdfLink = updateResponse.uploadedFiles['file.pdf']
        //  res.status(200).json(updateResponse);

        // res.json({ pdfLink })

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: 'An error occurred' });
    }



};


module.exports = { getPDF };
