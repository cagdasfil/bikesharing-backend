module.exports = {


    updateUserRole: async (userid, roleType) => {
        
        const role = await strapi.query('role', 'users-permissions').findOne({ type:roleType }, []);
        if(!role){
            const res = {
                status : 400,
                errorCode : -601,
                message : 'There is no such a role!'
            }
            return res;
        }
        
        try{
            const user = await strapi.query('user','users-permissions').update({ id: userid }, { role: role.id });
            if (!user) {
                const res = {
                    status : 404,
                    errorCode : -602,
                    message : 'There is no such a user!'
                }
                return res;
            }
        
            //Return Response
            const res = {
                status : 200,
                data : user,
                message : 'OK'
            }; 
            return res;

        }catch(err){
            const res = {
                status : 304,
                errorCode : -600,
                message : err
            };
            await strapi.query('errors').create(res);
            return res;
        }
    },
};
