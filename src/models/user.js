const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')


const userSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
        trim:true
    },
    age:{
        type:Number,
        default:0,
        validate(value){
            if(value<0){
                throw new Error("Age must be psoitive")
            }
        }
    },
    email:{
        type:String,
        unique:true,
        required:true,
        trim:true,
        lowercase:true,
        validate(value){
            if(!validator.isEmail(value)){
                throw new Error("Email is invalid!")
            }
        }
    },
    password:{
        type:String,
        required:true,
        trim:true,
        validate(value){

            if(value.length<6 || value.toLowerCase().includes("password")){
                throw new Error("Dont use password as password!")
            }
        }
    },
    tokens:[{
        token:{
            type:String,
            required:true
        }
    }],
    avatar:{
        type:Buffer
    },
    productRatings:[
        {
          product:{
              type:String,
              default:""
        },
        rating:{
            type:Number,
            default:0
        }
        }
    ]

},{
    timestamps:true
})

userSchema.virtual('tasks',{
    ref:'Tasks',
    localField:"_id",
    foreignField:"owner"
})

userSchema.methods.toJSON= function () {
    const user = this
    const userObject = user.toObject()
    delete userObject.password
    delete userObject.tokens
    delete userObject.avatar
    return userObject
}

userSchema.methods.generateAuthToken = async function (){
    const user = this
    const token = jwt.sign({_id:user._id.toString()},String(process.env.JWT_SECRET))
    user.tokens = user.tokens.concat({token:token})
    await user.save()
    return token
}

userSchema.statics.findByCredentials = async (email,password)=>{
    const user = await User.findOne({email:email})
    if(!user){
        throw new Error('Invalid login')
    }
    const isMatch = await bcrypt.compare(password,user.password)
    if(!isMatch){
        throw new Error("Invalid login")
    }
    return user
}


//Hash the password before saving
userSchema.pre('save',async function (next){
    const user = this

    if(user.isModified('password')){
        user.password = await bcrypt.hash(user.password,8)
    }
    next()
})

//Delete user tasks before deleting user

userSchema.pre('remove', async function (next){
    const user = this
    await Task.deleteMany({owner:user._id})
    next()
})


const User = mongoose.model('User',userSchema)

module.exports = User