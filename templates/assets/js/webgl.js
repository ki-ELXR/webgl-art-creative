"use strict";

function main() {
  // Get A WebGL context
  /** @type {HTMLCanvasElement} */
  const canvas = document.querySelector("#canvas");
  const gl = canvas.getContext("webgl2");
  if (!gl) {
    return;
  }

  const vs = `#version 300 es
    // an attribute is an input (in) to a vertex shader.
    // It will receive data from a buffer
    in vec4 a_position;

    // all shaders have a main function
    void main() {

      // gl_Position is a special variable a vertex shader
      // is responsible for setting
      gl_Position = a_position;
    }
  `;

  const fs = `#version 300 es
    precision highp float;

    uniform vec2 iResolution;
    uniform vec2 iMouse;
    uniform float iTime;

    // we need to declare an output for the fragment shader
    out vec4 outColor;
    
    // Beginning of Shadertoy Code ---------------------------------------------------
    
    #define PI 3.14159265359
    #define TWOPI 6.28318530718
    #define sat(x) clamp(x, 0., 1.)
    #define BG_COL (1.0 / 255.0) * vec3(0.0, 0.0, 0.0)
    
    
    float remap01(float a, float b, float t) {
    	return sat((t-a)/(b-a));
    }
    
    float remap(float a, float b, float c, float d, float t) {
    	return sat((t-a)/(b-a)) * (d-c) + c;
    }
    
    vec2 within(vec2 uv, vec4 rect) {
    	return (uv-rect.xy)/(rect.zw-rect.xy);
    }
    
    // used to plot a regular graph by subtracting two halves of the screen
    // st is an xy coordinate system
    // var is your f(x) function. ie, to plot y = x^2,
    // the function should be plot(uv, uv.x * uv.x)
    float plot(vec2 st, float var, float line_width){
        
        return smoothstep(var - line_width, var, st.y) -
              smoothstep(var, var + line_width, st.y);
    
    }
    
    
    
    float curve(float x){
      //float y = 1 - sqrt(1 - x*x);
        float y = (x*x*x);
      return y;
    }
    
    float sdParabola(vec2 pos, float wi, float he, float thickness)
    {
        pos.x = abs(pos.x);
    
        float ik = wi*wi/he;
        float p = ik*(he-pos.y-0.5*ik)/3.0;
        float q = pos.x*ik*ik*0.25;
        float h = q*q - p*p*p;
        
        float x;
        if( h>0.0 ) // 1 root
        {
            float r = sqrt(h);
            x = pow(q+r,1.0/3.0) + pow(abs(q-r),1.0/3.0)*sign(p);
        }
        else        // 3 roots
        {
            float r = sqrt(p);
            x = 2.0*r*cos(acos(q/(p*r))/3.0); // see https://www.shadertoy.com/view/WltSD7 for an implementation of cos(acos(x)/3) without trigonometrics
        }
        
        x = min(x,wi);
        
        float d = length(pos-vec2(x,he-x*x/ik)) * sign(ik*(pos.y-he)+pos.x*pos.x);
            
        // thickness of the line; larger the value , thicker the line.
        d = abs(d) - thickness;
    
        return d;
    }
    
    vec2 rotate_xy(vec2 xy, float theta)
    {
        // Given an xy coordinate system and an angle theta, rotate the coordinate system in the xy plane
        // around the origin by the angle theta. useful for rotating previously made objects
    
        // defintion of rotation in cartestian (xy) coordinates.
        mat2 rot_mat = mat2 (cos(theta), sin(theta), -sin(theta), cos(theta));
        // rotate the all coordinates in the cartesian plane.
        vec2 xy_rotated = rot_mat * vec2 (xy.x, xy.y);            
        return xy_rotated;
    }
    
    mat2 Rot(float a) {
    	float s=sin(a), c=cos(a);
        return mat2(c,-s,s,c);
    }
    
    
    // 2D Random
    float random ( vec2 st) {
        return fract(sin(dot(st.xy,
                             vec2(12.9898,78.233)))
                     * 43758.5453123);
    }
    
    // 2D Noise based on Morgan McGuire @morgan3d
    // https://www.shadertoy.com/view/4dS3Wd
    float noise ( vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);
    
        // Four corners in 2D of a tile
        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));
    
        // Smooth Interpolation
    
        // Cubic Hermine Curve.  Same as SmoothStep()
        vec2 u = f*f*(3.0-2.0*f);
        // u = smoothstep(0.,1.,f);
    
        // Mix 4 coorners percentages
        return mix(a, b, u.x) +
                (c - a)* u.y * (1.0 - u.x) +
                (d - b) * u.x * u.y;
    }
    
    float fbmNoise(vec2 uv)
    {    
        
        int numOctaves = 22;
        float H = 1.0;
        float G = exp2(-H);
        float f = 2.9;
        float a = 1.0;
        float t = 0.0;
        for( int i=0; i<numOctaves; i++ )
        {
            t += a*noise(f*uv);
            f *= 2.0;
            a *= G;
        }
        return t;
    }
    
    
    float sdCircle( vec2 p, float r)
    {
        return (length(p) - r);
    }
    
    vec4 makeBlueCircle(vec2 uv)
    {
            //*** object(uv, col) returns a color vec4. col is the previous color value (that has all the previous components in it)
        // and needs to be passed to the function, otherwise the function will overwrite all the other elements in the frame.
        // Typically only the .xyz value is used to manipulate the function(uv, col), and the 4th vector component/alpha channel
        // is added back in at the end.
        // Then the mix function is used to  interpolate between the previous color and the alpha channel of the object
    
        // adjust position of circle
        uv.x += -0.75;
        uv.y += .053;
     
    
        // -----------------------
        vec4 circleColor = vec4((1.0 / 255.0) * vec3(0.0, 0.0, 255.0),1.0);
        float d = length(uv);
        float blur = 0.05;
        float circleSize =  0.1;
        circleColor.a = smoothstep(circleSize, circleSize-blur, d);
        return circleColor;
    }
    
    vec4 drawScene(vec2 uv)
    {
    
        // Background
        // Gradient Background
        //vec2 xy = uv;
        //vec3 bg_gradient1 = vec3(0.2, 0.2, 0.7) * (uv.y + 0.5);
        //vec3 bg_gradient2 = vec3(0.1, 0.6, 0.1) * (-uv.y + 0.5);
        //vec3 bg = bg_gradient1 + bg_gradient2;
        //vec3 col = bg;
        // Solid Color Background
        //vec3 col = (BG_COL);
        vec4 col = vec4(BG_COL,1.0);   
    
        
    
        // *** Copying the coordinate system into another variable enables you distort the domain of specific objects
        // in this case, abs(uv.x) mirrors objects about the y axis
    
        // Method 1 - Requires colors to be in the form of vec4s       
        vec4 blueCircle = makeBlueCircle(uv);
        col = mix(col, blueCircle, blueCircle.a);  
        // Using within to domain distort, the uv_xmirror to mirror objects about y-axis
        vec2 uv_xmirror = uv;
        uv_xmirror.x = abs(uv_xmirror.x);    
        vec4 twoBlueCircles = makeBlueCircle(within(uv_xmirror, vec4(-0.1, -0.1, 0.1, 0.1)));
        col = mix(col, twoBlueCircles, twoBlueCircles.a);  
    
    
    
        // Method 2 - Note the vec3/xyz implementation
        vec3 redCircleColor = (1.0 / 255.0) * vec3(255.0, 0.0, 0.0);
        uv += vec2(0.5, 0.0);
        float circle = sdCircle(uv, 0.05);
        float circleSize = 0.1;
        float blur = 0.05;
        float redCircleShape = smoothstep(circleSize, circleSize - blur, circle);
        col.xyz = mix(col.xyz, redCircleColor, redCircleShape);
    
    
        // Method 3
        uv -= vec2(0.5, 0.0);
        float greenCircle = sdCircle(uv, 0.05); 
        vec3 previousCol = col.xyz;
        vec3 greenCircleCol = mix(vec3(0, 1, 0), previousCol, step(0.0, greenCircle));
        col = vec4(greenCircleCol, 1.0);
    
        // Method 4
        uv -= vec2(0.5, 0.0);
        float yellowCircle = sdCircle(uv, 0.05); 
        //col.xyz = mix(vec3(1, 1, 0), col.xyz, clamp(yellowCircle, vertKnob, horiKnob));
        col.xyz = mix(vec3(1, 1, 0), col.xyz, step(0.0, yellowCircle));
            
        return col;
    }
    
    void mainImage( out vec4 fragColor, in vec2 fragCoord )
    {
        // Normalized pixel coordinates (from 0 to 1)
        vec2 uv = (fragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;
        
        vec4 col = (drawScene(uv));
    
        // Output to screen
        fragColor = vec4(col.xyz,1.0);
    }
    
    // End of Shadertoy Code ---------------------------------------------------
    
    // Define this function to work with shadertoy code
    void main() {
      mainImage(outColor, gl_FragCoord.xy);
    }
  `;

  // setup GLSL program
  const program = webglUtils.createProgramFromSources(gl, [vs, fs]);

  // look up where the vertex data needs to go.
  const positionAttributeLocation = gl.getAttribLocation(program, "a_position");

  // look up uniform locations
  const resolutionLocation = gl.getUniformLocation(program, "iResolution");
  const mouseLocation = gl.getUniformLocation(program, "iMouse");
  const timeLocation = gl.getUniformLocation(program, "iTime");

  // Create a vertex array object (attribute state)
  const vao = gl.createVertexArray();

  // and make it the one we're currently working with
  gl.bindVertexArray(vao);

  // Create a buffer to put three 2d clip space points in
  const positionBuffer = gl.createBuffer();

  // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // fill it with a 2 triangles that cover clip space
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,  // first triangle
     1, -1,
    -1,  1,
    -1,  1,  // second triangle
     1, -1,
     1,  1,
  ]), gl.STATIC_DRAW);

  // Turn on the attribute
  gl.enableVertexAttribArray(positionAttributeLocation);

  // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
  gl.vertexAttribPointer(
      positionAttributeLocation,
      2,          // 2 components per iteration
      gl.FLOAT,   // the data is 32bit floats
      false,      // don't normalize the data
      0,          // 0 = move forward size * sizeof(type) each iteration to get the next position
      0,          // start at the beginning of the buffer
  );

  let mouseX = 0;
  let mouseY = 0;

  function setMousePosition(e) {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = rect.height - (e.clientY - rect.top) - 1;  // bottom is 0 in WebGL
  }

  canvas.addEventListener('mousemove', setMousePosition);
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
  }, {passive: false});
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    setMousePosition(e.touches[0]);
  }, {passive: false});

  function render(time) {
    time *= 0.001;  // convert to seconds

    webglUtils.resizeCanvasToDisplaySize(gl.canvas);

    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Tell it to use our program (pair of shaders)
    gl.useProgram(program);

    // Bind the attribute/buffer set we want.
    gl.bindVertexArray(vao);

    gl.uniform2f(resolutionLocation, gl.canvas.width, gl.canvas.height);
    gl.uniform2f(mouseLocation, mouseX, mouseY);
    gl.uniform1f(timeLocation, time);

    gl.drawArrays(
        gl.TRIANGLES,
        0,     // offset
        6,     // num vertices to process
    );

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

main();
