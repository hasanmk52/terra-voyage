"use client"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
        <div className="prose prose-lg max-w-none">
          <p className="text-gray-600 mb-6">
            <strong>Last updated:</strong> {new Date().toLocaleDateString()}
          </p>
          
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Demo Version Notice</h2>
              <p className="text-gray-700 leading-relaxed">
                This is a demonstration version of Terra Voyage. In this demo mode, your data is stored 
                locally on your device and is not transmitted to any servers. We do not collect, store, 
                or process any personal information during your use of the demo.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Information We Collect</h2>
              <p className="text-gray-700 leading-relaxed">
                In the full version of Terra Voyage, we may collect information such as your travel 
                preferences, itinerary data, and account information to provide personalized travel 
                planning services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">How We Use Information</h2>
              <p className="text-gray-700 leading-relaxed">
                Any information collected would be used solely to improve your travel planning experience, 
                provide customer support, and enhance our services. We never sell personal information to third parties.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Security</h2>
              <p className="text-gray-700 leading-relaxed">
                We implement appropriate security measures to protect your information. In the demo version, 
                all data remains on your local device.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Us</h2>
              <p className="text-gray-700 leading-relaxed">
                If you have any questions about this Privacy Policy, please contact us at{" "}
                <a href="/contact" className="text-blue-600 hover:text-blue-800">
                  our contact page
                </a>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}