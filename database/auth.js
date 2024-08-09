const mongoose = require('mongoose');

const companyAuthSchema = new mongoose.Schema({
    companyId: {
        type: String,
        required: true, 
    },
    accessToken: {
        type: String,
        required: true, 
    },
    refreshToken: {
        type: String,
        required: true, 
    },
    location: {
        type: String,
        required: false, 
    }
}, {
    timestamps: true
});

const CompanyAuth = mongoose.model('CompanyAuth', companyAuthSchema);

module.exports = CompanyAuth;
