const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    id: Number,
    task: String,
    due: String,
    hoursAllocated: Number,
    completed: Boolean
}, { _id: false });

const goalSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    tasks: [taskSchema],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Goal', goalSchema);
