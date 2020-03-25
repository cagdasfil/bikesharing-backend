'use strict';
const ApplicationServices = require('../services/Application');

module.exports = {

    setAdmin : async ctx => {
        return await ApplicationServices.updateUserRole(String(ctx.request.body.userId), "admin");
    },

    setAuthenticated : async ctx => {
        return await ApplicationServices.updateUserRole(String(ctx.request.body.userId), "authenticated");
    },


};
