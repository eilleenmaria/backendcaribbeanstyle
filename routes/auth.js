const express = require('express');
const {check, validationResult, body} = require('express-validator');
const router = express.Router();
const helper = require('../config/helpers');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');


// LOGIN ROUTE
router.post('/login', [helper.hasAuthFields, helper.isPasswordAndUserMatch], (req, res) => {
    let token = jwt.sign({state: 'true', email: req.body.email, username: req.body.username}, helper.secret, {
        algorithm: 'HS512',
        expiresIn: '4h'
    });
    res.json({
        token: token,
        auth: true,
        email: req.email,
        username: req.username,
        fname: req.fname,
        lname: req.lname,
        photoUrl: req.photoUrl,
        userId: req.userId,
		type: req.type,
		role: req.role
    });
});

// REGISTER ROUTE
router.post('/register', [
    check('email').isEmail().not().isEmpty().withMessage('Field can\'t be empty')
        .normalizeEmail({all_lowercase: true}),

    check('password').escape().trim().not().isEmpty().withMessage('Field can\'t be empty')
        .isLength({min: 6}).withMessage("must be 6 characters long"),
    body('email').custom(value => {
        return helper.database.table('users').filter({
            $or:
                [
                    {email: value}, {username: value.split("@")[0]}
                ]
        }).get().then(user => {
            if (user) {
                console.log(user);
                return Promise.reject('Email / Username already exists, choose another one.');
            }
        })
    })
], async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(422).json({errors: errors.array()});
    } else {
        let email = req.body.email;
        let username = email.split("@")[0];
        let password = await bcrypt.hash(req.body.password, 10);
        let fname = req.body.fname;
        let lname = req.body.lname;
        let typeOfUser = req.body.typeOfUser;
        let photoUrl = req.body.photoUrl

        /**
         * ROLE 777 = ADMIN
         * ROLE 555 = CUSTOMER
         **/
        helper.database.table('users').insert({
            username: username,
            password: password || null,
            email: email,
            role: 555,
            lname: lname || null,
            fname: fname || null,
            type: typeOfUser || 'local',
            photoUrl: photoUrl || 'https://image.shutterstock.com/image-vector/person-gray-photo-placeholder-man-260nw-1259815156.jpg'
        }).then(lastId => {
            if (lastId.affectedRows > 0) {
                console.log(lastId.affectedRows);
                res.status(201).json({message: 'Registration successful'});
            } else {
                console.log(lastId.affectedRows);
                res.status(501).json({message: 'Registration failed'});
            }
        }).catch(err => res.status(433).json({error: err}));
    }
});


module.exports = router;