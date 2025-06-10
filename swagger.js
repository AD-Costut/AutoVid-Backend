const swaggerJSDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "AutoVid API",
      version: "1.0.0",
      description: "API pentru generare videoclipuri AutoVid",
    },
  },
  apis: ["./public/src/controllers/*.js"],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = { swaggerUi, swaggerSpec };
