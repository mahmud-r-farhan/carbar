const userModel = require ('../models/user.model');


module.exports.createUser = async ({
    firstname, lastname, email, password, verificationCode
}) => {
    if(!firstname || !email || !password){
        throw new Error ('All fields are require');
    }
    const user = userModel.create({
        fullname:{
            firstname,
            lastname
        },
        email,
        password,
        verificationCode,
    })

    return user;
}