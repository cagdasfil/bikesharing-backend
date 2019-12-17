'use strict';

/**
 * Read the documentation () to implement custom controller functions
 */

module.exports = {

    withBikes : async ctx => {

        try{
            const dockers = await strapi.query('dockers').find();
            const dockerNumber = dockers.length;
            var availResponse = [];
            for(var i = 0 ; i< dockerNumber; i++){
                var currentDocker = dockers[i];
                const currentAvails = await strapi.query('bikes').find({lastDockerId: currentDocker.id, isAvailable : true});
                availResponse.push ({
                    currentDocker,
                    availableBikeNumber: currentAvails.length
                });
            } 
            //Return Response
            const status = 200;
            const message = 'OK';
            return ctx.response.send({ status : status, data : availResponse, message : message });
        
        }catch(err){
            ctx.send({message: err});
        }

    },
};
