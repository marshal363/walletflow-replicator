// Examplea making sure users Sync betwen Convex and Clerk

"use client"

import { useUser } from "@clerk/clerk-react";

import {useEffect}from "react";

function SyncUserWithCOnvex(){
    const {user} = useUser();
const updateUser = useMutation(api.users.updateUser);

useEffect(() => {
    if (!user) return;

    const syncUser = async () =>{
        try{
            await updateUser({
                userId: user.id,
                name: user.fullName,
                email: user.emailAddresss[0]?.emailAddress ?? "",
            });
        } catch (error){
            console.error("Error syncing user:", error);
        }
    }
    syncUser();
}, [user, updateUser]);

return null
}
export default SyncUserWithCOnvex;