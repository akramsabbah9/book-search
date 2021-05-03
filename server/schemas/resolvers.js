const { AuthenticationError } = require("apollo-server-express");
const { User } = require("../models"); // don't get Book. It's a subdocument
const { signToken } = require("../utils/auth");

const resolvers = {
    Query: {
        // get logged-in user info
        me: async(parent, args, context) => {
            if (context.user) {
                const userData = await User.findOne({ _id: context.user._id })
                    .select("-__v -password");
            
                return userData;
            }

            throw new AuthenticationError("Not logged in");
        }
    },
    Mutation: {
        // log in a user and give them a token
        login: async (parent, { email, password }) => {
            const user = await User.findOne({ email });

            if (!user) {
                throw new AuthenticationError("Incorrect credentials");
            }

            const correctPw = await user.isCorrectPassword(password);

            if (!correctPw) {
                throw new AuthenticationError("Incorrect credentials");
            }

            const token = signToken(user);
            return { token, user };
        },
        // add a new user
        addUser: async (parent, args) => {
            const user = await User.create(args);
            const token = signToken(user);

            return { token, user };
        },
        // allow logged-in user to save a book
        saveBook: async (parent, { book }, context) => {
            if (context.user) {
                const updatedUser = await User.findOneAndUpdate(
                    { _id: context.user._id },
                    // use addToSet instead of push to avoid duplicates
                    { $addToSet: { savedBooks: book } },
                    { new: true, runValidators: true }
                );

                return updatedUser;
            }

            throw new AuthenticationError("Not logged in");
        },
        // allow logged-in user to remove a book by id
        removeBook: async (parent, { bookId }, context) => {
            if (context.user) {
                const updatedUser = await User.findOneAndUpdate(
                    { _id: context.user._id },
                    // remove saved book with this id from the array
                    { $pull: { savedBooks: { bookId: bookId } } },
                    { new: true }
                );

                return updatedUser;
            }

            throw new AuthenticationError("Not logged in");
        }
    }
};

module.exports = resolvers;
