import { response } from "express"
import { asyncHandler } from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"

const registerUser = asyncHandler(async (req, res) => {
    const { username, fullname, email, password } = req.body
    res.json({ username, fullname, email, password })

    const existUser = User.findOne({
        $or: [{ username }, { email }]
    })
    if (existUser) {
        throw new ApiError(409, `User already exist with username[${username}] and email[${email}].`)
    }
    if (
        [username, email, password, fullname].some(field =>
            field?.trim() === ""
        )
    ) {
        throw new ApiError(400, "Required fields cant be empty.");

    }

    const avatarLocalPath = req.files?.avatar?.[0]?.path
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path
    if (!avatar) {
        throw new ApiError(400, "Avatar image is required.")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    const user=User.create({
        fullname,
        username:username.toLowerCase(),
        password,
        email,
        avatar:avatar.url,
        coverImage:coverImage?.url || ""
    })

    const createdUser=User.findById(user._id).select("-password -refreshToken")
    if(!createdUser){
        throw new ApiError(500,"User registration failed.");
    }

    return res.status(201).json(
        ApiResponse(200,createdUser,"User registered successfully!")
    )
})

export { registerUser }

// Get req from frontend
// Validate unique user with username and email
// Check for image and avatar
// Upload image and avatar on cloudinary
// Create user object and add in db
// Remove password and refresh token from res
// Check for user creation
// return response