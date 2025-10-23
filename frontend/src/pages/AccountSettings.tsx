import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { userService } from '../services/userService';
import './AccountSettings.css';

interface User {
  _id: string;
  client_id: string;
  company_name: string;
  your_name: string;
  email: string;
  phone_number: string;
  user_type: string;
  gstin: string;
  joined_date: string;
  address: {
    full_address: string;
    landmark: string;
    pincode: string;
    city: string;
    state: string;
  };
  bank_details: {
    bank_name: string;
    account_number: string;
    ifsc_code: string;
    branch_name: string;
    account_holder_name: string;
  };
  documents: Array<{
    document_type: string;
    document_status: string;
    file_url: string;
    upload_date: string;
  }>;
  kyc_status: {
    status: string;
    verified_date?: string;
  };
  api_details: {
    public_key: string;
    private_key: string;
    api_documentation_version: string;
  };
}

interface EditMode {
  userDetails: boolean;
  address: boolean;
  bankDetails: boolean;
}

const AccountSettings: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState<EditMode>({
    userDetails: false,
    address: false,
    bankDetails: false
  });

  // Form states
  const [formData, setFormData] = useState({
    company_name: '',
    your_name: '',
    email: '',
    phone_number: '',
    gstin: '',
    address: {
      full_address: '',
      landmark: '',
      pincode: '',
      city: '',
      state: ''
    },
    bank_details: {
      bank_name: '',
      account_number: '',
      ifsc_code: '',
      branch_name: '',
      account_holder_name: ''
    }
  });

  // Password reset state
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showPassword, setShowPassword] = useState(false);

  // Document upload state
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      // Debug authentication status
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      console.log('🔍 AUTH DEBUG:', {
        hasToken: !!token,
        hasUser: !!user,
        tokenLength: token?.length,
        userData: user ? JSON.parse(user) : null
      });

      // API call to get user data
      const response = await userService.getProfile();
      console.log('✅ API Response:', response);
      setUser(response);
      setFormData({ 
        company_name: response.company_name || '',
        your_name: response.your_name || '',
        email: response.email || '',
        phone_number: response.phone_number || '',
        gstin: response.gstin || '',
        address: response.address || {
          full_address: '',
          landmark: '',
          pincode: '',
          city: '',
          state: ''
        },
        bank_details: response.bank_details || {
          bank_name: '',
          account_number: '',
          ifsc_code: '',
          branch_name: '',
          account_holder_name: ''
        }
      });
    } catch (error) {
      console.error('❌ Error fetching user data:', error);
      
      // Type-safe error handling
      const errorDetails = {
        message: error instanceof Error ? error.message : 'Unknown error',
        status: (error as any)?.response?.status || 'N/A',
        data: (error as any)?.response?.data || 'N/A',
        config: (error as any)?.config || 'N/A'
      };
      
      console.error('❌ Error details:', errorDetails);
      
      // Show error state instead of dummy data
      setUser(null);
      alert('Failed to load user data. Please check if you are logged in and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (section: string, field: string, value: string) => {
    if (section === 'address' || section === 'bank_details') {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...(prev as any)[section],
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const toggleEditMode = (section: keyof EditMode) => {
    setEditMode(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleSave = async (section: string) => {
    try {
      setLoading(true);
      
      let dataToUpdate = {};
      if (section === 'userDetails') {
        // Validate GSTIN format before sending
        if (formData.gstin && !validateGSTIN(formData.gstin)) {
          alert('Please enter a valid GSTIN format (e.g., 22ABCDE1234F1Z5)');
          setLoading(false);
          return;
        }
        
        dataToUpdate = {
          company_name: formData.company_name,
          your_name: formData.your_name,
          email: formData.email,
          phone_number: formData.phone_number,
          gstin: formData.gstin
        };
      } else if (section === 'address') {
        dataToUpdate = { address: formData.address };
      } else if (section === 'bankDetails') {
        dataToUpdate = { bank_details: formData.bank_details };
      }

      // Debug: Log the data being sent
      console.log('🚀 SENDING DATA TO BACKEND:', {
        section,
        dataToUpdate,
        timestamp: new Date().toISOString()
      });

      // API call to update
      const response = await userService.updateProfile(dataToUpdate);
      console.log('✅ BACKEND RESPONSE:', response);
      
      // Update both user state and form data
      setUser(response);
      setFormData({
        company_name: response.company_name || '',
        your_name: response.your_name || '',
        email: response.email || '',
        phone_number: response.phone_number || '',
        gstin: response.gstin || '',
        address: response.address || {
          full_address: '',
          landmark: '',
          pincode: '',
          city: '',
          state: ''
        },
        bank_details: response.bank_details || {
          bank_name: '',
          account_number: '',
          ifsc_code: '',
          branch_name: '',
          account_holder_name: ''
        }
      });
      
      alert(`${section} updated successfully!`);
      toggleEditMode(section as keyof EditMode);
      
      console.log('✅ FRONTEND UPDATED WITH NEW DATA:', response);

    } catch (error) {
      console.error(`Error updating ${section}:`, error);
      
      // Handle validation errors from backend
      if ((error as any)?.response?.data?.errors) {
        const validationErrors = (error as any).response.data.errors;
        const errorMessages = Object.values(validationErrors).join(', ');
        alert(`Validation Error: ${errorMessages}`);
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        alert(`Failed to update ${section}: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.new_password !== passwordData.confirm_password) {
      alert('New password and confirm password do not match!');
      return;
    }

    if (passwordData.new_password.length < 6) {
      alert('Password must be at least 6 characters long!');
      return;
    }

    try {
      setLoading(true);

      // API call to reset password
      const response = await userService.resetPassword({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      });

      alert('Password reset successfully!');
      setShowPasswordReset(false);
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });

    } catch (error) {
      console.error('Error resetting password:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to reset password: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentUpload = async (documentType: string, file: File) => {
    console.log('🔍 HANDLE DOCUMENT UPLOAD:', {
      documentType,
      file,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      isFile: file instanceof File
    });

    if (!file) {
      console.error('❌ NO FILE PROVIDED');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert('Only JPG, PNG, and PDF files are allowed');
      return;
    }

    setUploadingDoc(documentType);

    try {
      console.log('🚀 UPLOADING DOCUMENT:', {
        documentType,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        timestamp: new Date().toISOString()
      });

      // API call to upload document (will use Cloudinary in backend)
      const response = await userService.uploadDocument({
        file: file,
        document_type: documentType
      });

      console.log('✅ DOCUMENT UPLOAD SUCCESS:', response);
      alert('Document uploaded successfully!');
      fetchUserData();

    } catch (error) {
      console.error('Error uploading document:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to upload document: ${errorMessage}`);
    } finally {
      setUploadingDoc(null);
    }
  };

  const getDocumentStatus = (docType: string) => {
    if (!user?.documents) return null;
    return user.documents.find(doc => doc.document_type === docType);
  };

  // ✅ Fix PDF URLs to use /raw/upload/ instead of /image/upload/
  const getPdfViewUrl = (cloudinaryUrl: string) => {
    if (cloudinaryUrl && cloudinaryUrl.includes('/image/upload/')) {
      return cloudinaryUrl.replace('/image/upload/', '/raw/upload/');
    }
    return cloudinaryUrl;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploaded':
      case 'verified':
        return 'status-uploaded';
      case 'pending':
        return 'status-pending';
      case 'rejected':
        return 'status-rejected';
      default:
        return '';
    }
  };

  const maskAccountNumber = (accountNumber: string) => {
    if (!accountNumber) return '';
    const visible = accountNumber.slice(-4);
    return `XXXXXXXXXX${visible}`;
  };

  const maskPrivateKey = (key: string) => {
    if (!key) return '';
    return `${key.slice(0, 10)}...${key.slice(-10)}`;
  };

  // GSTIN validation function
  const validateGSTIN = (gstin: string): boolean => {
    if (!gstin) return true; // Allow empty GSTIN
    // GSTIN format: 2 digits + 5 letters + 4 digits + 1 letter + 1 digit + Z + 1 alphanumeric
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstinRegex.test(gstin.toUpperCase());
  };

  if (loading && !user) {
    return (
      <Layout>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading account settings...</p>
        </div>
      </Layout>
    );
  }

  if (!user && !loading) {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      // Redirect to login if no token
      window.location.href = '/login';
      return null;
    }
    
    return (
      <Layout>
        <div className="loading-container">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Failed to Load User Data</h2>
            <p className="text-gray-600 mb-4">Unable to fetch your account information.</p>
            <div className="space-y-2">
              <button 
                onClick={fetchUserData}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 mr-2"
              >
                Retry
              </button>
              <button 
                onClick={() => {
                  localStorage.removeItem('token');
                  localStorage.removeItem('user');
                  window.location.href = '/login';
                }}
                className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600"
              >
                Logout & Login Again
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="account-settings-container">
        {/* Profile Header */}
        <div className="profile-header">
          <div className="profile-avatar">
            <div className="avatar-circle">
              {user?.your_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <button className="edit-avatar-btn">✏️</button>
          </div>
          <div className="profile-info">
            <h2>{user?.company_name || 'Loading...'}</h2>
            <p className="client-id">Client ID: {user?.client_id || 'Loading...'}</p>
          </div>
        </div>

        {/* User Details Card */}
        <div className="settings-card">
          <div className="card-header">
            <h3>👤 User Details</h3>
            <button
              className="edit-btn"
              onClick={() => toggleEditMode('userDetails')}
            >
              ✏️
            </button>
          </div>
          <div className="card-body">
            <div className="info-grid">
              <div className="info-item">
                <label>Company:</label>
                {editMode.userDetails ? (
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => handleInputChange('', 'company_name', e.target.value)}
                  />
                ) : (
                  <span>{user?.company_name || 'Not set'}</span>
                )}
              </div>
              <div className="info-item">
                <label>Email:</label>
                {editMode.userDetails ? (
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('', 'email', e.target.value)}
                  />
                ) : (
                  <span>{user?.email || 'Not set'}</span>
                )}
              </div>
              <div className="info-item">
                <label>User:</label>
                {editMode.userDetails ? (
                  <input
                    type="text"
                    value={formData.your_name}
                    onChange={(e) => handleInputChange('', 'your_name', e.target.value)}
                  />
                ) : (
                  <span>{user?.your_name || 'Not set'}</span>
                )}
              </div>
              <div className="info-item">
                <label>Phone:</label>
                {editMode.userDetails ? (
                  <input
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) => handleInputChange('', 'phone_number', e.target.value)}
                    maxLength={10}
                  />
                ) : (
                  <span>{user?.phone_number || 'Not set'}</span>
                )}
              </div>
              <div className="info-item">
                <label>User Type:</label>
                <span>{user?.user_type || 'Not set'}</span>
              </div>
              <div className="info-item">
                <label>Joined:</label>
                <span>{user?.joined_date ? new Date(user.joined_date).toLocaleString() : 'Not set'}</span>
              </div>
              <div className="info-item">
                <label>GSTIN:</label>
                {editMode.userDetails ? (
                  <div>
                    <input
                      type="text"
                      value={formData.gstin}
                      onChange={(e) => handleInputChange('', 'gstin', e.target.value)}
                      style={{
                        borderColor: formData.gstin && !validateGSTIN(formData.gstin) ? '#ff4444' : '#ddd'
                      }}
                      placeholder="22ABCDE1234F1Z5"
                    />
                    {formData.gstin && !validateGSTIN(formData.gstin) && (
                      <small style={{ color: '#ff4444', display: 'block', marginTop: '4px' }}>
                        Invalid GSTIN format. Use format: 22ABCDE1234F1Z5
                      </small>
                    )}
                  </div>
                ) : (
                  <span>{user?.gstin || 'Not set'}</span>
                )}
              </div>
              <div className="info-item">
                <label>Client ID:</label>
                <span>{user?.client_id || 'Not set'}</span>
              </div>
            </div>
            {editMode.userDetails && (
              <button
                className="save-btn"
                onClick={() => handleSave('userDetails')}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            )}
          </div>
        </div>

        {/* Address Card */}
        <div className="settings-card">
          <div className="card-header">
            <h3>📍 Address</h3>
            <button
              className="edit-btn"
              onClick={() => toggleEditMode('address')}
            >
              ✏️
            </button>
          </div>
          <div className="card-body">
            <div className="info-grid">
              <div className="info-item full-width">
                <label>Address:</label>
                {editMode.address ? (
                  <input
                    type="text"
                    value={formData.address.full_address}
                    onChange={(e) => handleInputChange('address', 'full_address', e.target.value)}
                  />
                ) : (
                  <span>{user?.address?.full_address || 'Not set'}</span>
                )}
              </div>
              <div className="info-item">
                <label>Landmark:</label>
                {editMode.address ? (
                  <input
                    type="text"
                    value={formData.address.landmark}
                    onChange={(e) => handleInputChange('address', 'landmark', e.target.value)}
                  />
                ) : (
                  <span>{user?.address?.landmark || 'Not set'}</span>
                )}
              </div>
              <div className="info-item">
                <label>City:</label>
                {editMode.address ? (
                  <input
                    type="text"
                    value={formData.address.city}
                    onChange={(e) => handleInputChange('address', 'city', e.target.value)}
                  />
                ) : (
                  <span>{user?.address?.city || 'Not set'}</span>
                )}
              </div>
              <div className="info-item">
                <label>Pincode:</label>
                {editMode.address ? (
                  <input
                    type="text"
                    value={formData.address.pincode}
                    onChange={(e) => handleInputChange('address', 'pincode', e.target.value)}
                    maxLength={6}
                  />
                ) : (
                  <span>{user?.address?.pincode || 'Not set'}</span>
                )}
              </div>
              <div className="info-item">
                <label>State:</label>
                {editMode.address ? (
                  <input
                    type="text"
                    value={formData.address.state}
                    onChange={(e) => handleInputChange('address', 'state', e.target.value)}
                  />
                ) : (
                  <span>{user?.address?.state || 'Not set'}</span>
                )}
              </div>
            </div>
            {editMode.address && (
              <button
                className="save-btn"
                onClick={() => handleSave('address')}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            )}
          </div>
        </div>

        {/* Bank Details Card */}
        <div className="settings-card">
          <div className="card-header">
            <h3>🏦 Bank Details</h3>
            <button
              className="edit-btn"
              onClick={() => toggleEditMode('bankDetails')}
            >
              ✏️
            </button>
          </div>
          <div className="card-body">
            <div className="info-grid">
              <div className="info-item">
                <label>Bank Name:</label>
                {editMode.bankDetails ? (
                  <input
                    type="text"
                    value={formData.bank_details.bank_name}
                    onChange={(e) => handleInputChange('bank_details', 'bank_name', e.target.value)}
                  />
                ) : (
                  <span>{user?.bank_details?.bank_name || 'Not set'}</span>
                )}
              </div>
              <div className="info-item">
                <label>Branch Name:</label>
                {editMode.bankDetails ? (
                  <input
                    type="text"
                    value={formData.bank_details.branch_name}
                    onChange={(e) => handleInputChange('bank_details', 'branch_name', e.target.value)}
                  />
                ) : (
                  <span>{user?.bank_details?.branch_name || 'Not set'}</span>
                )}
              </div>
              <div className="info-item">
                <label>A/C No:</label>
                {editMode.bankDetails ? (
                  <input
                    type="text"
                    value={formData.bank_details.account_number}
                    onChange={(e) => handleInputChange('bank_details', 'account_number', e.target.value)}
                  />
                ) : (
                  <span>{user?.bank_details?.account_number ? maskAccountNumber(user.bank_details.account_number) : 'Not set'}</span>
                )}
              </div>
              <div className="info-item">
                <label>IFSC:</label>
                {editMode.bankDetails ? (
                  <input
                    type="text"
                    value={formData.bank_details.ifsc_code}
                    onChange={(e) => handleInputChange('bank_details', 'ifsc_code', e.target.value)}
                  />
                ) : (
                  <span>{user?.bank_details?.ifsc_code || 'Not set'}</span>
                )}
              </div>
              <div className="info-item full-width">
                <label>A/C Name:</label>
                {editMode.bankDetails ? (
                  <input
                    type="text"
                    value={formData.bank_details.account_holder_name}
                    onChange={(e) => handleInputChange('bank_details', 'account_holder_name', e.target.value)}
                  />
                ) : (
                  <span>{user?.bank_details?.account_holder_name || 'Not set'}</span>
                )}
              </div>
            </div>
            {editMode.bankDetails && (
              <button
                className="save-btn"
                onClick={() => handleSave('bankDetails')}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            )}
          </div>
        </div>

        {/* Documents Card */}
        <div className="settings-card">
          <div className="card-header">
            <h3>📄 Documents</h3>
          </div>
          <div className="card-body">
            <table className="documents-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { type: 'gst_certificate', label: 'GST Certificate/Company Incorporated Document' },
                  { type: 'photo_selfie', label: 'Photo or Selfie' },
                  { type: 'pan_card', label: 'PAN Card/Driving License' },
                  { type: 'aadhaar_card', label: 'Aadhaar Card/Passport/Voter ID Card' }
                ].map((doc) => {
                  const docStatus = getDocumentStatus(doc.type);
                  return (
                    <tr key={doc.type}>
                      <td>{doc.label}</td>
                      <td>
                        <span className={`status-badge ${docStatus ? getStatusColor(docStatus.document_status) : 'status-pending'}`}>
                          {docStatus ? docStatus.document_status : 'Pending'}
                        </span>
                      </td>
                      <td className="action-btns">
                        <label className="upload-btn">
                          {uploadingDoc === doc.type ? 'Uploading...' : 'Update'}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/jpg,application/pdf"
                            onChange={(e) => e.target.files && handleDocumentUpload(doc.type, e.target.files[0])}
                            disabled={uploadingDoc === doc.type}
                            style={{ display: 'none' }}
                          />
                        </label>
                        {docStatus && (
                          <a
                            href={getPdfViewUrl(docStatus.file_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="view-btn"
                          >
                            View
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* KYC Status Card */}
        <div className={`settings-card kyc-status-card ${user?.kyc_status?.status || 'pending'}`}>
          <div className="card-header">
            <h3>
              {user?.kyc_status?.status === 'verified' ? '✅ KYC Verified' : 
               user?.kyc_status?.status === 'rejected' ? '❌ KYC Rejected' : 
               '⏳ KYC Pending Verification'}
            </h3>
            {user?.kyc_status?.status === 'verified' && (
              <div className="kyc-verified-badge">
                <span className="verified-icon">✓</span>
                <span>Verified</span>
              </div>
            )}
          </div>
          <div className="card-body">
            <div className="kyc-status">
              <div className="kyc-info">
                <label>KYC Status:</label>
                <span className={`status-badge ${user?.kyc_status?.status || 'pending'}`}>
                  {user?.kyc_status?.status === 'verified' ? 'Verified ✅' : 
                   user?.kyc_status?.status === 'rejected' ? 'Rejected ❌' : 
                   'Pending ⏳'}
                </span>
              </div>
              {user?.kyc_status?.verified_date && (
                <div className="kyc-info">
                  <label>Verified At:</label>
                  <span>{new Date(user.kyc_status.verified_date).toLocaleString()}</span>
                </div>
              )}
              {user?.kyc_status?.status === 'pending' && (
                <div className="kyc-pending-notice">
                  <p>📋 Your KYC documents are under review. Our admin team will verify your documents and update your status soon.</p>
                </div>
              )}
              {user?.kyc_status?.status === 'rejected' && (
                <div className="kyc-rejected-notice">
                  <p>⚠️ Your KYC verification was rejected. Please check your documents and re-upload if necessary.</p>
                </div>
              )}
              {user?.kyc_status?.status === 'verified' && (
                <div className="kyc-verified-notice">
                  <p>🎉 Congratulations! Your KYC has been successfully verified. You now have full access to all platform features.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* API Details Card */}
        <div className="settings-card">
          <div className="card-header">
            <h3>🔐 API Details</h3>
          </div>
          <div className="card-body">
            <div className="api-info">
              <div className="api-item">
                <label>Check latest version of API documentation:</label>
                <button className="api-btn">📄 View Docs</button>
              </div>
              <div className="api-item">
                <label>PDF version of API documentation:</label>
                <button className="api-btn">📥 Download</button>
              </div>
              <div className="api-item">
                <label>Private Key:</label>
                <span className="api-key">{user?.api_details?.private_key ? maskPrivateKey(user.api_details.private_key) : 'Not set'}</span>
              </div>
              <div className="api-item">
                <label>Public Key:</label>
                <span className="api-key">{user?.api_details?.public_key || 'Not set'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Reset Password Card */}
        <div className="settings-card">
          <div className="card-header">
            <h3>🔒 Reset Password</h3>
          </div>
          <div className="card-body">
            {!showPasswordReset ? (
              <button
                className="reset-password-trigger"
                onClick={() => setShowPasswordReset(true)}
              >
                Change Password
              </button>
            ) : (
              <form className="password-reset-form" onSubmit={handlePasswordReset}>
                <div className="form-group">
                  <label>Current Password:</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordData.current_password}
                    onChange={(e) => handlePasswordChange('current_password', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>New password:</label>
                  <div className="password-input">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordData.new_password}
                      onChange={(e) => handlePasswordChange('new_password', e.target.value)}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      👁️
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label>Confirm Password:</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordData.confirm_password}
                    onChange={(e) => handlePasswordChange('confirm_password', e.target.value)}
                    required
                  />
                </div>
                <div className="password-actions">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => {
                      setShowPasswordReset(false);
                      setPasswordData({
                        current_password: '',
                        new_password: '',
                        confirm_password: ''
                      });
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="update-btn"
                    disabled={loading}
                  >
                    {loading ? 'Updating...' : 'Update'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AccountSettings;
