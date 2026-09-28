import * as THREE       from 'three';
import { GLTFLoader }   from 'three/GLTFLoader.js';

const ROOT_BONES = [ 'pelvis', 'root' ];

export default async function quinnBuilder( rootPath, props={} ){
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    const opt  = { shadow:false, ...props };
    const gltf = await new GLTFLoader().loadAsync( rootPath + '/ue5_quinn_v2.glb' );
    const root = gltf.scene.children[0];
    const anim = gltf.animations;

    // Add toon shader to model
    fixAssetMaterial( root );

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    const actor = new Actor( root );
    if( opt.shadow ) actor.mesh.castShadow = true;

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Build Chibi Pose
    const map   = boneMap( actor.skel );
    const clip  = anim[0];
    let trk, name, type, j, itm;
    for( let i=clip.tracks.length-1; i >= 0; i-- ){
        trk     = clip.tracks[ i ];
        j       = trk.name.lastIndexOf( '.' );
        name    = trk.name.substr( 0, j );
        type    = trk.name.substr( j+1 );

        itm     = actor.chibi[ name ];
        if( !itm ) itm = actor.chibi[ name ] = { idx: map.getIndex( name ) };

        switch( type ){
            case 'scale':    itm.scl = Array.from( trk.values ); break;
            case 'position':
                itm.pos  = Array.from( trk.values );
                itm.opos = actor.skel.bones[ itm.idx ].position.toArray();
                break;
        }
    }

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    return actor;
}


class Actor{
    // #region MAIN
    root      = null;
    mesh      = null;
    skel      = null;
    chibi     = {};
    chibiScl  = 0;

    mixer     = new THREE.AnimationMixer( new THREE.Object3D() );
    action    = null;
    inPlace   = true;

    constructor( root ){
        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        this.root = root;
        this.mesh = root.children[0];
        this.skel = root.children[0].skeleton;
    }
    // #endregion

    // #region GETTERS / SETTERS

    setChibi( t ){
        const bones = this.skel.bones;
        let b;
        let ti = 1-t;
        for( const i of Object.values( this.chibi ) ){
            b = bones[ i.idx ];
            b.scale.x = ti + i.scl[0] * t;
            b.scale.y = ti + i.scl[1] * t;
            b.scale.z = ti + i.scl[2] * t;

            if( i.pos ){
                b.position.x = i.opos[0] * ti + i.pos[0] * t;
                b.position.y = i.opos[1] * ti + i.pos[1] * t;
                b.position.z = i.opos[2] * ti + i.pos[2] * t;
            }
        }

        this.chibiScl = t;
    }

    // #endregion

    // #region MIXER

    playClip( clip ){
        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        if( this.action ){ this.action.stop(); }

        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~s
        this.action = this.mixer.clipAction( clip, this.root );
        this.action.reset();
        this.action.setEffectiveTimeScale( 1 );
        this.action.setEffectiveWeight( 1 );
        // this.action.fadeIn( 0.1 );
        this.action.play();
    }

    cleanClip( clip ){
        let ie = clip.tracks.length-1;
        let trk, name, type, j;
        let doSwop, tmp;
        for( let i=ie; i >=0; i-- ){
            // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
            trk     = clip.tracks[ i ];
            j       = trk.name.lastIndexOf( '.' );
            name    = trk.name.substr( 0, j );
            type    = trk.name.substr( j+1 );
            doSwop  = false;

            // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
            switch( type ){
                case 'position':
                    if( ROOT_BONES.includes( name ) ) break;
                    // ELSE do the swop
                case 'scale':
                    doSwop = true;
                    break;
                default:
                    if( name.startsWith( 'ik_' ) ) doSwop = true;
                    break;
            }

            // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
            if( doSwop ){
                tmp             = clip.tracks[ie];
                clip.tracks[ie] = clip.tracks[i];
                clip.tracks[i]  = tmp;
                ie--;
            }
        }

        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        // Truncate the tracks array
        clip.tracks.length = ie + 1;
        return clip;
    }

    setPose( clip, time ){
        // PROBLEM, Mixer reset pose when action is stopped or removed
        // No easy way to set a pose from an animation and move on.
        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        const mix = this.mixer;
        let isNew = false;
        let act   = mix.existingAction( clip, this.root );
        if( !act ){
            act     = mix.clipAction( clip, this.root );
            isNew   = true;
        }

        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        const tm = Math.max( 0, Math.min( clip.duration, time ) );
        act.play();
        mix.setTime( tm );
        act.paused = true;
        // act.stop();

        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        // if( isNew ) mix.uncacheAction( clip, this.root );
    }

    setTime( t ){
        this.mixer.setTime( t );
        this.onAnimate();
    }

    // #endregion

    // #region LOOP
    update( dt ){
        this.mixer.update( dt );
        this.onAnimate();
    }

    onAnimate(){
        if( this.inPlace ){
            this.root.position.x = 0;
            this.root.position.z = 0;
        }

        if( this.chibiScl !== 0 ){
            const ti = 1 - this.chibiScl;
            // const y  = this.chibi.pelvis.opos[1] * ti
            //          + this.chibi.pelvis.pos[1]  * this.chibiScl;

            const y  = ( this.chibi.pelvis.opos[1] - this.chibi.pelvis.pos[1] )  * this.chibiScl;
            this.skel.bones[0].position.y -= y;
        }
    }
    // #endregion

    // #region DEBUG
    mkSkelView(){
        const skelView = new THREE.SkeletonHelper( this.skel.bones[0] );
        // skelView.material.color.set(0xff0000);
        return skelView;
    }
    // #endregion
}

function fixAssetMaterial( root ){
    let mat;
    for( const i of root.children ){
        if( i.type !== 'SkinnedMesh' ) continue;

        mat        = i.material;
        i.material = new THREE.MeshToonMaterial({
            map         : mat.map,
            normalMap   : mat.normalMap,
            color       : mat.color,
        });
    }
}

function boneMap( skel ){
    const bMap = new Map();
    for( const [i,o] of skel.bones.entries() ) bMap.set( o.name, i );

    bMap.getBone = ( o, sk=null )=>{
        const s = sk || skel;
        switch( typeof o ){
            case 'number' : return s.bones[ o ];
            case 'string' :
                const idx = bMap.get( o );
                return ( idx !== undefined )? s.bones[ idx ] : null;
        }
        return null;
    };

    bMap.pos = ( o, v=null, sk=null )=>{
        const b = bMap.getBone( o );
        if( !b ) return v || [0,0,0];
        return getWPos( b, v );
    }

    bMap.rot = ( o, v=null, sk=null )=>{
        const b = bMap.getBone( o );
        if( !b ) return v || [0,0,0,1];
        return getWRot( b, v );
    }

    bMap.getIndex = ( o, sk=null )=>{
        const s = sk || skel;
        return bMap.get( o );
    };

    return bMap;
}
