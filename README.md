# WSJCityPublicAPIDemo
Explore serverless by building WSJ City public API demo.

### Swagger
To play with API or just to get kind of visual representation, go to https://editor.swagger.io/ and paste in the content of swagger.json

### Deploy
To deploy API for your self you will need node.js and AWS account. In terminal you will have to then:
```sh
# Install the serverless cli
$ npm install -g serverless
$ npm install
$ export AWS_ACCESS_KEY_ID=
$ export AWS_SECRET_ACCESS_KEY=
# AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are now available for serverless to use
$ serverless deploy
```

### Import
There is wsj-crawler.js that will import top stories from WSJ City production into your deployment. However, you have to put **right** target URL (value of apiUrl variable).

### WSJ City iOS beta build
There is WSJ City iOS beta build which is connected to API deployed at https://6kcvfyb810.execute-api.eu-west-2.amazonaws.com/dev/stories. You can install the build from https://rink.hockeyapp.net/apps/6929cd2ce6f844adbaac96f0ee53f746/app_versions/32