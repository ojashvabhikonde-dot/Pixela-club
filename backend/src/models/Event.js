// backend/src/models/Event.js
import mongoose from 'mongoose';

const EventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    banner: { type: String }, // Cloudinary URL or external image
    eventType: { type: String, enum: ['WORKSHOP','WALK','COMPETITION','EXHIBITION','GUEST','MEETING'], required: true },
    location: { type: String },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    capacity: { type: Number },
    status: { type: String, enum: ['UPCOMING','ONGOING','COMPLETED','CANCELLED'], default: 'UPCOMING' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.models.Event || mongoose.model('Event', EventSchema);
