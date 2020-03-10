'use strict';
var Turf = require('@turf/turf');

module.exports = {

    closestZone : async ctx => {

        var location = JSON.parse(ctx.params.location);
        location = [location.longitude, location.latitude];
        var targetPoint = Turf.point(location);

        var centers = [];
        const dockers = await strapi.query('dockers').find();
        for(var i = 0 ; i< dockers.length; i++){
            var currentDocker = dockers[i];
            const polygon  = Turf.polygon(currentDocker.coordinates.geometry.coordinates);
            const center = Turf.centroid(polygon);
            const currentAvails = await strapi.query('bikes').find({lastDockerId : currentDocker.id, isAvailable : true});
            if(currentAvails.length) centers.push(Turf.point(center.geometry.coordinates));
        }
        centers = Turf.featureCollection(centers);
        var nearest = Turf.nearestPoint(targetPoint,centers);
        return ctx.send(nearest);
    },

    withBikes : async ctx => {

        //Find Dockers and it's bikes that are available currently
        const dockers = await strapi.query('dockers').find();
        var dockersWithBikes = [];
        for(var i = 0 ; i< dockers.length; i++){
            var currentDocker = dockers[i];
            const polygon  = Turf.polygon(currentDocker.coordinates.geometry.coordinates);
            const center = Turf.centroid(polygon);
            const currentAvails = await strapi.query('bikes').find({lastDockerId : currentDocker.id, isAvailable : true});
            dockersWithBikes.push ({
                currentDocker,
                center,
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
