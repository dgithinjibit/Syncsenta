# SyncSenta Mobile App - Build Notes

**Added**: 2026-04-28 01:40
**Platform**: React Native / Flutter (TBD based on studio frontend)
**Frontend Base**: https://studio-theta-murex.vercel.app/

## Mobile-Specific Considerations

### Architecture
- **Shared codebase** with web where possible
- **Offline-first** - critical for Kenya connectivity
- **PWA fallback** - works on all devices
- **Native features**: Camera, biometrics, push notifications

### Key Mobile Features
1. **Offline Mode** - Full functionality without internet
2. **Biometric Auth** - Fingerprint/Face ID for quick login
3. **Push Notifications** - Attendance alerts, assignment reminders
4. **Camera Integration** - Document scanning, profile photos
5. **Voice Input** - Mwalimu AI voice interaction
6. **Low Data Mode** - Optimized for slow connections

### Tech Stack Options
- **React Native** - Reuse React components from studio
- **Capacitor** - Turn web app into native app
- **Flutter** - If performance critical

### Mobile-First Tasks (Add to queue)
- [ ] Mobile app scaffold (React Native/Capacitor)
- [ ] Offline sync optimization for mobile
- [ ] Biometric authentication
- [ ] Push notification service
- [ ] Camera integration
- [ ] Voice input optimization
- [ ] Low-bandwidth mode

**Decision**: Will use **Capacitor** to wrap studio frontend - fastest path to mobile!
