import Vec3 from '@lib/maths/Vec3.js';
import Quat from '@lib/maths/Quat.js';

export default class InputState{
    // #region MAIN

    // ACTION STATE VALUES
    static END  = -1;
    static OFF  = 0;
    static INIT = 1;
    static HOLD = 2;

    // DATA
    actions  = {};  // List of actions and their state
    xAxis    = 0;   // Raw Direction Input : -1 to 1
    yAxis    = 0;

    // CAMERA
    viewRot    = new Quat();  // Camera's current rotation
    viewFwd    = new Vec3();  // Camera view firward direction on XZ plane
    viewRit    = new Vec3();  // Camera view right direction on XZ plane
    viewJoy    = new Vec3();  // Joysticks current direction in relation to camera view
    viewJoyWgt = 0;           // Magnitude of the joystick direction 0 to 1

    // #endregion

    // #region GETTERS / SETTERS
    setAction( key, isDown ){
        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        // Create Action
        let act = this.actions[ key ];
        if( !act ){
            act = this.actions[ key ] = { initTime:0, state:0 };
            console.log( `NEW ACTION: ${key}` );
        }

        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        // On Down : its STARTING or HOLDING when called again
        // On Up   : its ENDING or OFF when called again
        if( isDown ) act.state = act.state <= 0 ? InputState.INIT : InputState.HOLD;
        else         act.state = act.state > 0  ? InputState.END  : InputState.OFF;

        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        // Set inital time when pressed down
        if( act.state === InputState.INIT ) act.initTime = Date.now();
    }

    setAxes( x, y ){
        // if( Array.isArray( x ) ){
        //     this.xAxis = x[0];
        //     this.yAxis = x[1];
        // }else{
            this.xAxis = x;
            this.yAxis = y;
        // }
        return this;
    }

    isInit( key ){ return ( this.actions[key]?.state === InputState.INIT ); }
    isEnd( key ){ return ( this.actions[key]?.state === InputState.END ); }
    isOn( key ){ return ( this.actions[key]?.state > 0 ); }
    isOff( key ){
        const act = this.actions[key];
        return !act? true : ( act.state <= 0 ); // NO EXIST its OFF, else test
    }

    // How long an action is currently being helt down
    holdTime( key ){
        const act = this.actions[ key ];
        return ( act?.state > 0 )? Date.now() - act.initTime : -1;
    }
    // #endregion

    // #region THIRD PERSON
    updateFromCamera( cam ){
        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        // Compute XZ plane direction from camera view
        this.viewRot.copyObj( cam.quaternion );
        this.viewFwd.fromQuat( this.viewRot, [0,0,1] ).negate().sy(0).norm();
        this.viewRit.fromCross( this.viewFwd, [0,1,0] ).norm();

        // Debug.ln.addDir( null, this.viewFwd, 2, 0x00ff00 );
        // Debug.ln.addDir( null, this.viewRit, 2, 0xff0000 );

        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        // Compute the look / move to direction from input
        this.viewJoy.zero()
            .scaleThenAdd( this.yAxis, this.viewFwd )
            .scaleThenAdd( this.xAxis, this.viewRit );

        // For joysticks, what is the overall thottle or speed
        this.viewJoyWgt = Math.max( 0, Math.min( 1, this.viewJoy.len ) );
        this.viewJoy.norm();

        // Debug.ln.addDir( null, this.viewJoy, 5, 0xff00ff );
    }
    // #endregion
}
