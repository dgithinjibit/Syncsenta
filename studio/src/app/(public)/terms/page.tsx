"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsAndConditionsPage() {
    const router = useRouter();

    return (
        <div className="container mx-auto py-12 px-4 md:px-6">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-3xl">Terms and Conditions for SyncSenta</CardTitle>
                    <CardDescription>Last updated: September 21, 2026</CardDescription>
                </CardHeader>
                <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                    <p>
                        <strong>Important:</strong> SyncSenta is currently an experiment using demo accounts. Use fictional information only. This document is a product draft and must receive legal review before live school or child data is accepted.
                    </p>

                    <h2>1. Introduction and Acceptance of Terms</h2>
                    <p>
                        Welcome to SyncSenta ("the Application," "the Service," "we," "us," or "our"). The Service is an application owned and operated by the project creators ("the Company").
                    </p>
                    <p>
                        By creating an account, accessing, or using the Service in any manner, you, the user ("you," "your"), acknowledge that you have read, understood, and agree to be bound by these Terms, our <Link href="/privacy" className="underline">Privacy Policy</Link>, <Link href="/child-safety" className="underline">Child Safety Policy</Link>, and other policies referenced herein. If you do not agree, discontinue use immediately.
                    </p>

                    <h2>2. Intellectual Property Rights</h2>
                    <p>
                        The Service, its entire contents, features, and functionality—including but not limited to all information, software, code, algorithms, text, displays, graphics, images, video, and audio, and the design, selection, and arrangement thereof—are owned by the Company, its licensors, or other providers of such material. These are protected by international and Kenyan copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws.
                    </p>
                     <p>
                        SyncSenta's name, logo, and all related names, logos, product and service names, designs, and slogans are trademarks of the Company or its affiliates or licensors. You may not use such marks without our prior written permission. All other names, logos, product and service names, designs, and slogans on this Service are the trademarks of their respective owners.
                    </p>


                    <h2>3. User Accounts and Responsibilities</h2>
                    <p>
                        <strong>Account Creation:</strong> When you create an account, you represent and warrant that all information you provide is truthful, accurate, complete, and current. Demo accounts must use fictional information. A parent, guardian, teacher, or school must not create or enable a child account without the required authority and consent.
                    </p>
                    <p>
                        <strong>Account Security:</strong> You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password. You agree not to disclose your password to any third party. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account. We will not be liable for any loss or damage arising from your failure to comply with this security obligation.
                    </p>
                     <p>
                        <strong>User Conduct:</strong> You agree not to use the Service in any way that is unlawful, fraudulent, or malicious. This includes, but is not limited to:
                    </p>
                    <ul>
                        <li>Uploading or transmitting any data that contains viruses, Trojan horses, worms, or any other harmful code.</li>
                        <li>Attempting to gain unauthorized access to our servers, systems, or data.</li>
                        <li>Interfering with the proper working of the Service.</li>
                        <li>Engaging in any activity that could damage, disable, or impair the Service.</li>
                    </ul>

                    <h2>4. User-Generated Content</h2>
                    <p>
                        <strong>Content Responsibility:</strong> You are solely responsible for all Content that you upload, post, or otherwise make available on the Service. This includes ensuring that your Content is legal, accurate, and does not infringe on the intellectual property, privacy, or publicity rights of any third party.
                    </p>
                    <p>
                        <strong>Content License:</strong> By posting Content, you grant the Company a non-exclusive, royalty-free, perpetual, worldwide, and sublicensable license to use, reproduce, modify, adapt, publish, translate, create derivative works from, distribute, and display such Content in any media. This license is necessary for us to operate and improve the Service.
                    </p>
                     <p>
                        <strong>Content and AI Disclaimer:</strong> Generated content and user content may be inaccurate, incomplete, biased, or unsuitable. Teachers and authorised adults must review educational content before use. We are progressively implementing moderation and safeguarding controls; do not submit harmful, confidential, or sensitive child information during the experiment.
                    </p>
                    
                    <h2>5. Termination of Service</h2>
                    <p>
                       We may terminate or suspend your account and deny access to the Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the Service will cease immediately. If you wish to terminate your account, you may simply discontinue using the Service.
                    </p>

                     <h2>6. Limitation of Liability and Disclaimer of Warranties</h2>
                    <p>
                        <strong>Limitation of Liability:</strong> To the maximum extent permitted by law, in no event shall the Company, its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from:
                    </p>
                     <ul>
                        <li>Your access to, use of, or inability to access or use the Service;</li>
                        <li>Any conduct or Content of any third party on the Service;</li>
                        <li>Any Content obtained from the Service; and</li>
                        <li>Unauthorized access, use, or alteration of your transmissions or Content.</li>
                    </ul>
                    <p>
                        <strong>Disclaimer of Warranties:</strong> The Service is provided on an "AS IS" and "AS AVAILABLE" basis. We make no representations or warranties of any kind, express or implied, as to the operation of the Service or the information, Content, materials, or products included on the Service. You expressly agree that your use of the Service is at your sole risk.
                    </p>

                     <h2>7. Indemnification</h2>
                    <p>
                        You agree to defend, indemnify, and hold harmless the Company, its affiliates, licensors, and service providers, and its and their respective officers, directors, employees, contractors, agents, licensors, suppliers, successors, and assigns from and against any claims, liabilities, damages, judgments, awards, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising out of or relating to your violation of these Terms or your use of the Service, including, but not limited to, your User Content, any use of the Service's content, services, and products other than as expressly authorized in these Terms.
                    </p>


                    <h2>8. Governing Law and Dispute Resolution</h2>
                    <p>
                        These Terms shall be governed by and construed in accordance with the laws of the Republic of Kenya, without regard to its conflict of law provisions. Any dispute, claim, or controversy arising out of or relating to these Terms or the breach, termination, enforcement, interpretation, or validity thereof, shall be resolved exclusively by the competent courts located in Nairobi, Kenya.
                    </p>
                    
                    <h2>9. Changes to Terms</h2>
                    <p>
                        We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide at least thirty (30) days' notice prior to any new terms taking effect. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms. If you do not agree to the new terms, you are no longer authorized to use the Service.
                    </p>

                    <h2>10. Contact Us</h2>
                    <p>
                        If you have any questions about these Terms, please contact us by email.
                    </p>

                </CardContent>
            </Card>
        </div>
    );
}
