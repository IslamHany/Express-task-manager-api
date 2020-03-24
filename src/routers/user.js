const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const User = require('../models/user');
const auth = require('../middleware/auth');
const {sendWelcomeEmail, sendCancelationEmail} = require('../emails/account');
const router = new express.Router();

router.post('/users', async (req, res) => {
    const user = new User(req.body);
    try{
        await user.save();
        sendWelcomeEmail(user.email, user.name);
        const token = await user.generateAuthToken();
        res.status(201).send({user, token});
    }catch(e){
        res.status(400).send(e);
    }
});

router.post('/users/login', async (req, res) => {
    try{
        const user = await User.findByCredentials(req.body.email, req.body.password);
        const token = await user.generateAuthToken();
        res.send({user, token});
    }catch(e){
        res.status(400).send();
    }
});

router.post('/users/logout', auth, async (req, res) => {
    try{
        req.user.tokens = req.user.tokens.filter((token) => {
            return token.token !== req.token;
        });
        await req.user.save();
        res.send();
    }catch(e){
        res.status(500).send();
    }
});

router.post('/users/logoutAll', auth, async (req, res) => {
    try{
        req.user.tokens = [];
        await req.user.save();
        res.send();
    }catch(e){
        res.status(500).send();
    }
});

router.get('/users/me', auth, async (req, res) => {
    res.send(req.user);
});

//remember to remove the following route
router.get('/users', async (req, res) => {
    try{
        const users = await User.find({});
        res.status(200).send(users);
    }catch(e){
        res.status(500).send(err);
    }
});

router.patch('/users/me', auth, async (req, res) => {
    //convert object keys to an array of those keys
    const updates = Object.keys(req.body);
    const allowedUpdates = ['name', 'email', 'password', 'age'];
    const isValidOperation = updates.every((update) => {
        return allowedUpdates.includes(update);
    });
    if(!isValidOperation){
        return res.status(400).send({error: "Invalid Updates"});
    }
    try{
        const user = req.user;
        updates.forEach((update) => {
            user[update] = req.body[update];
        });
        await user.save();
        res.status(200).send(user);
    }catch(e){
        res.status(400).send(e);
    }
});

router.delete('/users/me', auth, async (req, res) => {
    const _id = req.user._id;
    try{
        await req.user.remove();
        sendCancelationEmail(req.user.email, req.user.name);
        res.send(req.user);
    }catch(e){
        res.status(500).send(e);
    }
});

const upload = multer({
    limits: {
        fileSize: 1000000
    },
    fileFilter(req, file, cb){
        if(!file.originalname.match(/\.(jpg|jpeg|png)$/)){
            return cb(new Error('Please upload an image'));
        }
        cb(undefined, true);
    }
});
router.post('/users/me/avatar', auth, upload.single('avatar'), async (req, res) => {
    const buffer = await sharp(req.file.buffer).resize({width: 250, height: 250}).png().toBuffer();
    req.user.avatar = buffer;
    await req.user.save();
    res.send();
}, (err, req, res, next) => {
    res.status(400).send({error: err.message});
});

router.delete('/users/me/avatar', auth, async (req, res) => {
    req.user.avatar = undefined;
    await req.user.save();
    res.send();
});

router.get('/users/:id/avatar', async (req, res) => {
    const _id = req.params.id;
    try{
        const user = await User.findById(_id);
        if(!user || !user.avatar){
            throw new Error();
        }
        //Set header
        res.set('Content-Type', 'image/png');
        res.send(user.avatar);
    }catch(e){
        res.status(404).send();
    }
});

module.exports = router;