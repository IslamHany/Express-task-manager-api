const express = require('express');
const Task = require('../models/task')
const auth = require('../middleware/auth')
const router = new express.Router();

router.post('/tasks', auth, async (req, res) => {
    const task = new Task({
        ...req.body,
        owner: req.user._id
    });
    try{
        await task.save();
        res.status(201).send(task);
    }catch(e){
        res.status(400).send(e);
    }
});

//GET /tasks?completed=false
//GET /tasks?limit=10&skip=0
//GET /tasks?sortBy=createdAt:asc
router.get('/tasks', auth, async (req, res) => {
    const match = {owner: req.user._id};
    if(req.query.completed){
        match.completed = req.query.completed
    }
    try{
        const limit = parseInt(req.query.limit);
        const skip = parseInt(req.query.skip) * limit;
        const sort = {};
        if(req.query.sortBy){
            const parts = req.query.sortBy.split(":");
            sort[parts[0]] = parts[1] === 'desc' ? -1 : 1;
        }
        const tasks = await Task.find(match).limit(limit).skip(skip).sort(sort);
        res.status(200).send(tasks);
    }catch(e){
        res.status(500).send(e);
    }
});

router.get('/tasks/:id', auth, async (req, res) => {
    const _id = req.params.id;
    try{
        const task = await Task.findOne({_id, owner: req.user._id});
        if(!task){
            return res.status(404).send();
        }
        res.status(200).send(task);
    }catch(e){
        res.status(500).send(e);
    }
});

router.patch('/tasks/:id', auth, async (req, res) => {
    //convert object keys to an array of those keys
    const updates = Object.keys(req.body);
    const allowedUpdates = ['description', 'completed'];
    const isValidOperation = updates.every((update) => {
        return allowedUpdates.includes(update);
    });
    if(!isValidOperation){
        return res.status(400).send({error: "Invalid Updates"});
    }
    const _id = req.params.id;
    try{
        const task = await Task.findOne({_id, owner: req.user._id});
        if(!task){
            return res.status(404).send();
        }
        updates.forEach((update) => {
            task[update] = req.body[update];
        });
        await task.save();
        res.status(200).send(task);
    }catch(e){
        res.status(400).send(e);
    }
});

router.delete('/tasks/:id', auth, async (req, res) => {
    const _id = req.params.id;
    try{
        const task = await Task.findOneAndDelete({_id, owner: req.user._id});
        if(!task){
            return res.status(404).send();
        }
        res.send(task);
    }catch(e){
        res.status(500).send(e);
    }
});

module.exports = router;