import { Client, Users, Databases, ID } from "node-appwrite";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = new Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.VITE_APPWRITE_API_KEY);

const users = new Users(client);
const databases = new Databases(client);

// ---------- CHANGE THESE ----------
const EMAIL = "socialpulse@gmail.com";
const PASSWORD = "Password123!";
const NAME = "SocialPulse Admin";
// ----------------------------------

async function main() {
    try {

        console.log("Creating Auth user...");

        const user = await users.create(
            ID.unique(),
            EMAIL,
            undefined,
            PASSWORD,
            NAME
        );

        console.log("Auth user created:");
        console.log(user.$id);

        console.log("Creating profile document...");

        await databases.createDocument(
            process.env.VITE_APPWRITE_DATABASE_ID,
            process.env.VITE_APPWRITE_USERS_COLLECTION_ID,
            user.$id,
            {
                name: NAME,
                username: "admin",
                email: EMAIL,
                avatar: "",
                bio: "",
                verified: true,
                role: "admin",
                followers: 0,
                following: 0,
                posts: 0,
                status: "active"
            }
        );

        console.log("Profile created.");
        console.log("DONE");
    }
    catch(err){
        console.error(err);
    }
}

main();
