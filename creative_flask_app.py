
# A very simple Flask Hello World app for you to get started with...

from flask import Flask, render_template
from flask_cors import CORS, cross_origin
app = Flask(__name__)
cors = CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'
app.config["DEBUG"] = True

@app.route('/')
def homepage():
    return render_template('index.html')

@app.route('/basicwebgl')
@cross_origin()
def basicwebgl():
    return render_template('basicwebgl.html')


@app.route('/webgl')
@cross_origin()
def webgl():
    return render_template('webgl.html')


