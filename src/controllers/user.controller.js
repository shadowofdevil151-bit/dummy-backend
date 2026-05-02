import { asyncHandler } from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { cleanupFiles } from "../utils/cleanupFiles.js"
import { isValidEmail } from "../utils/isValidEmail.js"
import jwt from "jsonwebtoken"

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken() // I mande thises functions on schema model, using await for safety, because generating can take time. Even though not required.
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })
        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "Failed to generate Access and Refresh token.");

    }

}


const registerUser = asyncHandler(async (req, res) => {

    const { username, email, password, fullname } = req.body
    const avatarLocalPath = req.files?.avatar?.[0]?.path || null
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path || null
    const fail = (status, message) => {
        cleanupFiles([avatarLocalPath, coverImageLocalPath]);
        throw new ApiError(status, message);
    };
    // Validate variables
    if ([username, email, password, fullname].some(field => !field || field.trim().length === 0)) fail(400, "Username, Email and Password fields are required.");
    if (!isValidEmail(email)) fail(400, "Email is not valid.");
    // Check if user already exists and required files recieved
    const existUser = await User.findOne({
        $or: [{ username }, { email }]
    });
    if (existUser) fail(409, `User already exist with username[${username}] or email[${email}]`);
    if (!avatarLocalPath) fail(400, "Avatar image is required.");

    // Uploading files
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = coverImageLocalPath ? await uploadOnCloudinary(coverImageLocalPath) : null
    if (!avatar) fail(500, "Avatar image loading failed.");

    // Create user
    const createdUser = await User.create({
        fullname,
        username: username.toLowerCase(),
        password,
        email,
        avatar: avatar.url,
        coverImage: coverImage?.url || ""
    });
    if (!createdUser) {
        throw new ApiError(500, "Creating user failed.");
    }

    // Send response
    res.status(201).json(
        new ApiResponse(201, {
            _id: createdUser._id,
            username: createdUser.username,
            email: createdUser.email,
            avatar: createdUser.avatar
        }, "User created successfully!")
    )

})


const loginUser = asyncHandler(async (req, res) => {
    try {
        const { username, email, password } = req.body
        if ((!username && !email) || !password) throw new ApiError(400, "Username, email and password is required for login.");
        const existUser = await User.findOne({ $or: [{ username }, { email }] })
        if (!existUser) throw new ApiError(404, 'User not exist with given username or email.');
        const isPasswordValid = await existUser.isPasswordCorrect(password)
        if (!isPasswordValid) throw new ApiError(401, "Wrong login password.");
        const { accessToken, refreshToken } = await generateAccessAndRefreshToken(existUser._id)
        const loggedInUser = await User.findById(existUser._id).select("-password -refreshToken")
        const options = { httpOnly: true, secure: true, sameSite: "strict" }
        res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(200, { user: loggedInUser, accessToken }, "User logged in successfully.") // Here sending refreshToken just for trying purpose. What if its for mobile app
            )
    } catch (error) {
        throw error;

    }
})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { refreshToken: undefined }
        },
        {
            returnDocument: 'after'
        }
    )
    const options = { secured: true, httpOnly: true }
    res.status(200)
        .clearCookie("refreshToken", options)
        .clearCookie("accessToken", options)
        .json(
            new ApiResponse(200, {}, "User logged out successfully.")
        )
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    try {
        const incomingRefreshToken = req.cookies?.refreshToken
        if (!incomingRefreshToken) throw new ApiError(401, "Unauthorized request.");

        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
        if (!decodedToken?._id) throw new ApiError(401, "Invalid refresh token");
        const user = await User.findById(decodedToken._id)
        if (!user) throw new ApiError(401, "Invalid refresh token.");

        if (incomingRefreshToken !== user.refreshToken) throw new ApiError(401, "Refresh token is expired or used.");
        const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)
        const options = {
            httpOnly: true,
            secure: true,
            sameSite: "strict"
        }
        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken },
                    "Access token refreshed."
                )
            )
    } catch (error) {
        console.log(error.message)
        throw new ApiError(401, "Invalid or expired refresh token")
    }

})

export { registerUser, loginUser, logoutUser, refreshAccessToken }