import mongoose, { InferSchemaType } from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    profilePicture: {
      type: String,
    },
    refreshTokens: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

interface TransformRet {
  _id?: mongoose.Types.ObjectId | string;
  __v?: number;
  id?: string;
  [key: string]: unknown;
}

userSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret: TransformRet) => {
    ret.id = typeof ret._id === 'object' ? String(ret._id) : (ret._id as string | undefined);
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('User', userSchema);
export type UserType = InferSchemaType<typeof userSchema>;
