const path = require('path');


module.exports = {
    mode: 'development',
    devtool: 'eval-source-map',
    entry: {
        auth: './src/auth.js',
        firebase: './src/firebase.js',
    },
    output:{
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].bundle.js' //has two separate bundle files
    }
};