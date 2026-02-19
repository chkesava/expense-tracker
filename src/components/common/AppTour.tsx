import { useState, useEffect } from 'react';
import Joyride, { STATUS } from 'react-joyride';
import type { CallBackProps, Step } from 'react-joyride';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUserRole } from '../../hooks/useUserRole';

export default function AppTour() {
    const [run, setRun] = useState(false);
    const { isAdmin } = useUserRole();
    const navigate = useNavigate();
    const location = useLocation();

    const TOUR_KEY = 'expense-tracker-tour-v1';

    useEffect(() => {
        const hasSeenTour = localStorage.getItem(TOUR_KEY);
        if (!hasSeenTour) {
            setRun(true);
        }
    }, []);

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status, type, index, action } = data;

        if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
            setRun(false);
            localStorage.setItem(TOUR_KEY, 'true');
        }

        // Handle navigation
        // Step 2 (Index 2) is "Let's go to Settings". On "next", we navigate.
        // Wait, let's look at the steps logic.
        if (type === 'step:after' && action === 'next') {
            if (index === (isAdmin ? 2 : 1)) {
                // If the next step is settings-related, navigate
                navigate('/settings');
            }
        }
    };

    const steps: Step[] = [
        {
            target: 'body',
            content: (
                <div className="text-left space-y-2">
                    <h3 className="font-bold text-lg">🎉 New Features Update!</h3>
                    <p>We've added some exciting new features to improve your experience.</p>
                    <ul className="list-disc pl-4 text-sm space-y-1">
                        {isAdmin && <li>Super Admin Dashboard</li>}
                        <li>Custom Usernames</li>
                        <li>Dashboard Widget Customization</li>
                    </ul>
                </div>
            ),
            placement: 'center',
            disableBeacon: true,
        },
        ...(isAdmin ? [{
            target: '#nav-admin-link, #mobile-nav-admin-link',
            content: 'Access the new Super Admin Dashboard here to view user stats and analytics.',
            title: 'For Admins Only 🛡️',
        }] : []),
        {
            // Target body to avoid issues if link is hidden or hard to target
            target: 'body',
            content: 'Let\'s head over to Settings to see the new customization options.',
            placement: 'center',
        },
        {
            target: '#settings-username-section',
            content: 'You can now set a custom username that will be visible across the app.',
            title: 'Set Your Identity 👤',
        },
        {
            target: '#settings-widgets-section',
            content: 'Customize your dashboard! Toggle widgets on or off to focus on what matters.',
            title: 'Your Dashboard, Your Way 📊',
        }
    ];

    if (!run) return null;

    return (
        <Joyride
            steps={steps}
            run={run}
            continuous
            showSkipButton
            showProgress
            callback={handleJoyrideCallback}
            styles={{
                options: {
                    primaryColor: '#3b82f6',
                    zIndex: 10000,
                },
                buttonNext: {
                    backgroundColor: '#2563eb',
                }
            }}
            locale={{
                last: 'Finish',
                skip: 'Skip Tour',
            }}
        />
    );
}
