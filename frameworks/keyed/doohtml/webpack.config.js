const path = require('path');

module.exports = {
    mode: 'development',
    entry: "./src/main.js",//path relative to this file
    
    optimization: {
        //minimize: false
    },
	output: {
		path: path.join(__dirname, 'dist'),
		filename: '[name].js'
	},

	module: {
		rules: [{
		test: /\.jsx?$/,
		exclude: /node_modules/,
		use: [
			{
				loader: 'babel-loader',
				options: {
					plugins: ["@babel/plugin-proposal-class-properties"]					
				}
			}			
		]
	}]		
	},


}
