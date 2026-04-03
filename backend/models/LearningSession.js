const mongoose = require('mongoose');

// Because curriculum objects from grok can be extremely dynamic and complex,
// we will just store it as a Mixed type to avoid rigid schema validation failures on AI output.
const learningSessionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true },
    mode: { type: String, enum: ['ai', 'manual', 'pdf'], default: 'ai' },
    curriculum: { type: mongoose.Schema.Types.Mixed },
    modules: [{ type: mongoose.Schema.Types.Mixed }], // for manual/pdf mode layouts
    timeSpentSec: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LearningSession', learningSessionSchema);
