import React, { useState } from 'react';
import Layout from '../components/Layout';
import { User, MapPin, Building, CreditCard, FileText, Shield, Key, Lock } from 'lucide-react';

const Settings: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Profile Header */}
        <div className="bg-[#fdddc1] rounded-lg shadow-lg p-8">
          <div className="bg-[#f68723] h-[120px] rounded-t-lg -m-8 mb-6 flex items-center justify-center">
            <div className="text-center">
              <div className="w-32 h-32 bg-white rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-4xl font-bold text-[#f68723]">WM</span>
              </div>
              <h1 className="text-white text-xl font-medium">Jaishree Suppliers</h1>
              <p className="text-white text-sm">Client ID: SS10000</p>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button className="bg-[#f68723] text-white px-4 py-2 rounded-lg text-sm">
              Edit
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* User Details */}
            <div className="bg-white rounded-lg shadow-lg">
              <div className="bg-[#21476e] h-[35px] rounded-t-lg flex items-center px-4">
                <User className="h-5 w-5 text-white mr-2" />
                <h2 className="text-white font-medium">User Details</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[#002b59] text-sm font-medium">Company:</label>
                    <p className="text-sm text-gray-600">Jaishree Suppliers</p>
                  </div>
                  <div>
                    <label className="text-[#002b59] text-sm font-medium">Email:</label>
                    <p className="text-sm text-gray-600">info.jaishreesuppliers@gmail.com</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[#002b59] text-sm font-medium">User:</label>
                    <p className="text-sm text-gray-600">Divanshu Mundhra</p>
                  </div>
                  <div>
                    <label className="text-[#002b59] text-sm font-medium">Phone:</label>
                    <p className="text-sm text-gray-600">8875013781</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[#002b59] text-sm font-medium">User Type:</label>
                    <p className="text-sm text-gray-600">Manufacturers & Wholesalers</p>
                  </div>
                  <div>
                    <label className="text-[#002b59] text-sm font-medium">Joined:</label>
                    <p className="text-sm text-gray-600">25 May 2025, 10:45 AM</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[#002b59] text-sm font-medium">GSTIN:</label>
                    <p className="text-sm text-gray-600">08DUBPM8039k1z6</p>
                  </div>
                  <div>
                    <label className="text-[#002b59] text-sm font-medium">Client ID:</label>
                    <p className="text-sm text-gray-600">SS10000</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="bg-white rounded-lg shadow-lg">
              <div className="bg-[#21476e] h-[35px] rounded-t-lg flex items-center px-4">
                <MapPin className="h-5 w-5 text-white mr-2" />
                <h2 className="text-white font-medium">Address</h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-[#002b59] text-sm font-medium">Address:</label>
                  <p className="text-sm text-gray-600">Swami mohalla, inside Jassusar gate</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[#002b59] text-sm font-medium">City:</label>
                    <p className="text-sm text-gray-600">Bikaner</p>
                  </div>
                  <div>
                    <label className="text-[#002b59] text-sm font-medium">State:</label>
                    <p className="text-sm text-gray-600">Rajasthan</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[#002b59] text-sm font-medium">Landmark:</label>
                    <p className="text-sm text-gray-600">Near Hanuman Temple</p>
                  </div>
                  <div>
                    <label className="text-[#002b59] text-sm font-medium">Pincode:</label>
                    <p className="text-sm text-gray-600">334001</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bank Details */}
            <div className="bg-white rounded-lg shadow-lg">
              <div className="bg-[#21476e] h-[35px] rounded-t-lg flex items-center px-4">
                <CreditCard className="h-5 w-5 text-white mr-2" />
                <h2 className="text-white font-medium">Bank Details</h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-[#002b59] text-sm font-medium">Bank Name:</label>
                  <p className="text-sm text-gray-600">Bank of Baroda</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[#002b59] text-sm font-medium">A/C No.:</label>
                    <p className="text-sm text-gray-600">26570100021799</p>
                  </div>
                  <div>
                    <label className="text-[#002b59] text-sm font-medium">IFSC:</label>
                    <p className="text-sm text-gray-600">BARB0NATHUS</p>
                  </div>
                </div>
                <div>
                  <label className="text-[#002b59] text-sm font-medium">Branch Name:</label>
                  <p className="text-sm text-gray-600">Nathusar gate</p>
                </div>
                <div>
                  <label className="text-[#002b59] text-sm font-medium">A/C Name:</label>
                  <p className="text-sm text-gray-600">Narayan Mundhra</p>
                </div>
              </div>
            </div>

            {/* Documents */}
            <div className="bg-white rounded-lg shadow-lg">
              <div className="bg-[#21476e] h-[35px] rounded-t-lg flex items-center px-4">
                <FileText className="h-5 w-5 text-white mr-2" />
                <h2 className="text-white font-medium">Documents</h2>
                <span className="ml-auto text-white text-sm">Status</span>
                <span className="ml-4 text-white text-sm">Action</span>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-[#002b59] text-sm font-medium">GST Certificate/Company Incorporated Document</label>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="bg-green-500 text-white px-2 py-1 rounded text-xs">Uploaded</span>
                    <button className="bg-[#f68723] text-white px-3 py-1 rounded text-xs">Update</button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-[#002b59] text-sm font-medium">Photo or Selfie</label>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="bg-red-500 text-white px-2 py-1 rounded text-xs">Pending</span>
                    <button className="bg-[#f68723] text-white px-3 py-1 rounded text-xs">Update</button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-[#002b59] text-sm font-medium">PAN Card/Driving License</label>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="bg-green-500 text-white px-2 py-1 rounded text-xs">Uploaded</span>
                    <div className="flex space-x-2">
                      <button className="bg-[#f68723] text-white px-3 py-1 rounded text-xs">Update</button>
                      <button className="border border-[#f68723] text-[#f68723] px-3 py-1 rounded text-xs">View</button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-[#002b59] text-sm font-medium">Aadhaar Card/Passport/Voter ID Card</label>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="bg-green-500 text-white px-2 py-1 rounded text-xs">Uploaded</span>
                    <div className="flex space-x-2">
                      <button className="bg-[#f68723] text-white px-3 py-1 rounded text-xs">Update</button>
                      <button className="border border-[#f68723] text-[#f68723] px-3 py-1 rounded text-xs">View</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Status Cards */}
          <div className="space-y-6">
            {/* KYC Status */}
            <div className="bg-white rounded-lg shadow-lg">
              <div className="bg-[#21476e] h-[35px] rounded-t-lg flex items-center px-4">
                <Shield className="h-5 w-5 text-white mr-2" />
                <h2 className="text-white font-medium">KYC Status</h2>
              </div>
              <div className="p-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-[#002b59] mb-2">200</div>
                  <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm inline-block">
                    Verified
                  </div>
                </div>
              </div>
            </div>

            {/* API Details */}
            <div className="bg-white rounded-lg shadow-lg">
              <div className="bg-[#21476e] h-[35px] rounded-t-lg flex items-center px-4">
                <Key className="h-5 w-5 text-white mr-2" />
                <h2 className="text-white font-medium">API Details</h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-[#002b59] text-sm font-medium">Check latest version of API documentation:</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="bg-[#f68723] text-white px-2 py-1 rounded text-xs">200</span>
                    <button className="text-[#f68723] text-xs">View</button>
                  </div>
                </div>
                <div>
                  <label className="text-[#002b59] text-sm font-medium">PDF version of API documentation:</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="bg-[#f68723] text-white px-2 py-1 rounded text-xs">200</span>
                    <button className="text-[#f68723] text-xs">View</button>
                  </div>
                </div>
                <div>
                  <label className="text-[#002b59] text-sm font-medium">Private Key:</label>
                  <p className="text-sm text-[#f68723] font-mono">XXXXXXXXXXXXXXX</p>
                </div>
                <div>
                  <label className="text-[#002b59] text-sm font-medium">Public Key:</label>
                  <p className="text-sm text-gray-600 font-mono">6WB4rtJCXofI0FQ81hyp</p>
                </div>
              </div>
            </div>

            {/* Reset Password */}
            <div className="bg-white rounded-lg shadow-lg">
              <div className="bg-[#21476e] h-[35px] rounded-t-lg flex items-center px-4">
                <Lock className="h-5 w-5 text-white mr-2" />
                <h2 className="text-white font-medium">Reset Password</h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-[#002b59] text-sm font-medium">Current Password:</label>
                  <p className="text-sm text-gray-600">Abcghsdgfdhf</p>
                </div>
                <div>
                  <label className="text-[#002b59] text-sm font-medium">New password:</label>
                  <p className="text-sm text-gray-600">Hjdhfweuiohfj</p>
                </div>
                <div>
                  <label className="text-[#002b59] text-sm font-medium">Confirm Password:</label>
                  <p className="text-sm text-gray-600">xxxxxxxxxx</p>
                </div>
                <button className="w-full bg-[#f68723] text-white py-2 rounded-lg text-sm font-medium">
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;