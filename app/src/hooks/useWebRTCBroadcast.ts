import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

// High-speed silent connection parameters
const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

export function useWebRTCBroadcast(
    isSessionActive: boolean, 
    videoElement: HTMLVideoElement | null,
    streamId: string = 'live_stream_1'
) {
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const channelRef = useRef<any>(null);

    useEffect(() => {
        if (!isSessionActive || !videoElement || !videoElement.srcObject) {
            // Cleanup on session end
            if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
                peerConnectionRef.current = null;
            }
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
            return;
        }

        const stream = videoElement.srcObject as MediaStream;
        
        // 1. Initialize Supabase Realtime Channel
        const channel = supabase.channel(`webrtc:${streamId}`, {
            config: {
                broadcast: { ack: false },
            },
        });
        channelRef.current = channel;

        const setupPeerConnection = async () => {
             // Clean up any existing connection
            if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
            }

            const pc = new RTCPeerConnection(ICE_SERVERS);
            peerConnectionRef.current = pc;

            // Add local stream tracks to PC
            stream.getTracks().forEach(track => {
                pc.addTrack(track, stream);
            });

            // Handle ICE Candidates (Local -> Remote)
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    channel.send({
                        type: 'broadcast',
                        event: 'candidate',
                        payload: { candidate: event.candidate }
                    });
                }
            };

            // Listen for signaling messages from Admin (Viewer)
            channel.on('broadcast', { event: 'answer' }, async ({ payload }) => {
                if (payload.answer && pc.signalingState !== 'closed') {
                    try {
                        await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
                    } catch (e) {
                        console.error("Error setting remote description:", e);
                    }
                }
            });

            channel.on('broadcast', { event: 'candidate' }, async ({ payload }) => {
                if (payload.candidate && pc.remoteDescription) {
                    try {
                        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
                    } catch (e) {
                        console.error("Error adding ICE candidate:", e);
                    }
                }
            });

            // If Admin requests an offer (e.g. they joined late)
            channel.on('broadcast', { event: 'request_offer' }, async () => {
                 await createAndSendOffer(pc, channel);
            });

            // Subscribe and send initial offer
            channel.subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await createAndSendOffer(pc, channel);
                }
            });
        };

        const createAndSendOffer = async (pc: RTCPeerConnection, channel: any) => {
            try {
                 const offer = await pc.createOffer({
                    offerToReceiveAudio: false,
                    offerToReceiveVideo: false
                 });
                 await pc.setLocalDescription(offer);
                 channel.send({
                     type: 'broadcast',
                     event: 'offer',
                     payload: { offer }
                 });
            } catch (err) {
                console.error("Failed to create offer:", err);
            }
        }

        setupPeerConnection();

        return () => {
            if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
                peerConnectionRef.current = null;
            }
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };

    }, [isSessionActive, videoElement]); // Re-run if session state changes
}
