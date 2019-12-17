'use strict';

module.exports = {

    withBikes : async ctx => {

        //Find Dockers and it's bikes that are available currently
        const dockers = await strapi.query('dockers').find();
        const dockerNumber = dockers.length;
        var dockersWithBikes = [];
        for(var i = 0 ; i< dockerNumber; i++){
            var currentDocker = dockers[i];
            const currentAvails = await strapi.query('bikes').find({lastDockerId : currentDocker.id, isAvailable : true});
            dockersWithBikes.push ({
                currentDocker,
                availableBikeNumber: currentAvails.length
            });
        }
        //Return Response
        const res = {
            status : 200,
            data : dockersWithBikes,
            message : 'OK'
        };  
        return ctx.send(res);
    },
};
