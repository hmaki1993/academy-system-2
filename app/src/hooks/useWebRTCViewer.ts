import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

export function useWebRTCViewer(streamId: string = 'live_stream_1') {
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const channelRef = useRef<any>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<'DISCONNECTED' | 'CONNECTING' | 'CONNECTED'>('DISCONNECTED');

    useEffect(() => {
        setConnectionStatus('CONNECTING');
        
        // 1. Initialize Supabase Realtime Channel
        const channel = supabase.channel(`webrtc:${streamId}`);
        channelRef.current = channel;

        const setupPeerConnection = () => {
            if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
            }

            const pc = new RTCPeerConnection(ICE_SERVERS);
            peerConnectionRef.current = pc;

            pc.onconnectionstatechange = () => {
                if (pc.connectionState === 'connected') {
                    setConnectionStatus('CONNECTED');
                } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                    setConnectionStatus('DISCONNECTED');
                    setRemoteStream(null);
                }
            };

            // Handle incoming remote track (the video stream)
            pc.ontrack = (event) => {
                if (event.streams && event.streams[0]) {
                    setRemoteStream(event.streams[0]);
                }
            };

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

            // Listen for signaling messages from Trainee (Broadcaster)
            channel.on('broadcast', { event: 'offer' }, async ({ payload }) => {
                if (payload.offer && pc.signalingState !== 'closed') {
                    try {
                        await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);
                        
                        channel.send({
                             type: 'broadcast',
                             event: 'answer',
                             payload: { answer }
                        });
                    } catch (e) {
                        console.error("Error handling offer:", e);
                    }
                }
            });

            channel.on('broadcast', { event: 'candidate' }, async ({ payload }) => {
                 if (payload.candidate && pc.remoteDescription) {
                      try {
                          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
                      } catch (e) {
                          console.error("Error adding viewer ICE candidate:", e);
                      }
                 }
            });

            channel.subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                     // Request offer from broadcaster if they are already live
                     channel.send({
                         type: 'broadcast',
                         event: 'request_offer',
                         payload: {}
                     });
                }
            });
        };

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

    }, [streamId]);

    return { remoteStream, connectionStatus };
}
