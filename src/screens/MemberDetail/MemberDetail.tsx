import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import Button from 'react-bootstrap/Button';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { USER_DETAILS } from 'GraphQl/Queries/Queries';
import styles from './MemberDetail.module.css';
import { languages } from 'utils/languages';
import { UPDATE_USER_MUTATION } from 'GraphQl/Mutations/mutations';
import { toast } from 'react-toastify';
import { errorHandler } from 'utils/errorHandler';
import Loader from 'components/Loader/Loader';
import useLocalStorage from 'utils/useLocalstorage';
import Avatar from 'components/Avatar/Avatar';
import {
  CalendarIcon,
  DatePicker,
  LocalizationProvider,
} from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { Form, Modal } from 'react-bootstrap';
import convertToBase64 from 'utils/convertToBase64';
import sanitizeHtml from 'sanitize-html';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import {
  educationGradeEnum,
  maritalStatusEnum,
  genderEnum,
  employmentStatusEnum,
} from 'utils/formEnumFields';
import DynamicDropDown from 'components/DynamicDropDown/DynamicDropDown';
import { UNASSIGN_USER_TAG } from 'GraphQl/Mutations/TagMutations';

type MemberDetailProps = {
  id?: string; // This is the userId
};

/**
 * MemberDetail component is used to display the details of a user.
 * It also allows the user to update the details. It uses the UPDATE_USER_MUTATION to update the user details.
 * It uses the USER_DETAILS query to get the user details. It uses the useLocalStorage hook to store the user
 *  details in the local storage.
 * @param id - The id of the user whose details are to be displayed.
 * @returns  React component
 *
 */
const MemberDetail: React.FC<MemberDetailProps> = ({ id }): JSX.Element => {
  const { t } = useTranslation('translation', {
    keyPrefix: 'memberDetail',
  });
  const { t: tCommon } = useTranslation('common');
  const location = useLocation();
  const isMounted = useRef(true);
  const { getItem, setItem } = useLocalStorage();
  const currentUrl = location.state?.id || getItem('id') || id;
  document.title = t('title');
  const [formState, setFormState] = useState({
    firstName: '',
    lastName: '',
    email: '',
    appLanguageCode: '',
    image: '',
    gender: '',
    birthDate: '2024-03-14',
    grade: '',
    empStatus: '',
    maritalStatus: '',
    phoneNumber: '',
    address: '',
    state: '',
    city: '',
    country: '',
    pluginCreationAllowed: false,
  });
  // Handle date change
  const handleDateChange = (date: Dayjs | null): void => {
    if (date) {
      setFormState((prevState) => ({
        ...prevState,
        birthDate: dayjs(date).format('YYYY-MM-DD'), // Convert Dayjs object to JavaScript Date object
      }));
    }
  };
  const [updateUser] = useMutation(UPDATE_USER_MUTATION);
  const {
    data: user,
    loading: loading,
    refetch,
  } = useQuery(USER_DETAILS, {
    variables: { id: currentUrl }, // For testing we are sending the id as a prop
  });
  const userData = user?.user;

  useEffect(() => {
    if (userData && isMounted) {
      // console.log(userData);
      setFormState({
        ...formState,
        firstName: userData?.user?.firstName,
        lastName: userData?.user?.lastName,
        email: userData?.user?.email,
        appLanguageCode: userData?.appUserProfile?.appLanguageCode,
        gender: userData?.user?.gender,
        birthDate: userData?.user?.birthDate || '2020-03-14',
        grade: userData?.user?.educationGrade,
        empStatus: userData?.user?.employmentStatus,
        maritalStatus: userData?.user?.maritalStatus,
        phoneNumber: userData?.user?.phone?.mobile,
        address: userData.user?.address?.line1,
        state: userData?.user?.address?.state,
        city: userData?.user?.address?.city,
        country: userData?.user?.address?.countryCode,
        pluginCreationAllowed: userData?.appUserProfile?.pluginCreationAllowed,
        image: userData?.user?.image || '',
      });
    }
  }, [userData, user]);

  useEffect(() => {
    // check component is mounted or not
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    // setFormState({
    //   ...formState,
    //   [name]: value,
    // });
    // console.log(name, value);
    setFormState((prevState) => ({
      ...prevState,
      [name]: value,
    }));
    // console.log(formState);
  };

  const [unassignUserTag] = useMutation(UNASSIGN_USER_TAG);

  const handleUnassignTag = async (): Promise<void> => {
    try {
      await unassignUserTag({
        variables: {
          tagId: unassignTagId,
          userId: currentUrl,
        },
      });

      refetch();
      toggleUnassignTagModal();
      toast.success(t('successfullyUnassigned') as string);
    } catch (error: unknown) {
      /* istanbul ignore next */
      if (error instanceof Error) {
        toast.error(error.message);
      }
    }
  };

  const [unassignTagModalIsOpen, setUnassignTagModalIsOpen] = useState(false);

  const [unassignTagId, setUnassignTagId] = useState(null);
  const toggleUnassignTagModal = (): void => {
    if (unassignTagModalIsOpen) {
      setUnassignTagId(null);
    }
    setUnassignTagModalIsOpen(!unassignTagModalIsOpen);
  };

  // const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
  //   const { name, value } = e.target;
  //   setFormState({
  //     ...formState,
  //     phoneNumber: {
  //       ...formState.phoneNumber,
  //       [name]: value,
  //     },
  //   });
  //   // console.log(formState);
  // };

  const handleToggleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    // console.log(e.target.checked);
    const { name, checked } = e.target;
    setFormState((prevState) => ({
      ...prevState,
      [name]: checked,
    }));
    // console.log(formState);
  };

  const loginLink = async (): Promise<void> => {
    try {
      // console.log(formState);
      const firstName = formState.firstName;
      const lastName = formState.lastName;
      const email = formState.email;
      // const appLanguageCode = formState.appLanguageCode;
      const image = formState.image;
      // const gender = formState.gender;
      let toSubmit = true;
      if (firstName.trim().length == 0 || !firstName) {
        toast.warning('First Name cannot be blank!');
        toSubmit = false;
      }
      if (lastName.trim().length == 0 || !lastName) {
        toast.warning('Last Name cannot be blank!');
        toSubmit = false;
      }
      if (email.trim().length == 0 || !email) {
        toast.warning('Email cannot be blank!');
        toSubmit = false;
      }
      if (!toSubmit) return;
      try {
        const { data } = await updateUser({
          variables: {
            //! Currently only some fields are supported by the api
            id: currentUrl,
            ...formState,
          },
        });
        /* istanbul ignore next */
        if (data) {
          if (getItem('id') === currentUrl) {
            setItem('FirstName', firstName);
            setItem('LastName', lastName);
            setItem('Email', email);
            setItem('UserImage', image);
          }
          toast.success(tCommon('successfullyUpdated') as string);
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          errorHandler(t, error);
        }
      }
    } catch (error: unknown) {
      /* istanbul ignore next */
      if (error instanceof Error) {
        errorHandler(t, error);
      }
    }
  };

  if (loading) {
    return <Loader />;
  }

  const sanitizedSrc = sanitizeHtml(formState.image, {
    allowedTags: ['img'],
    allowedAttributes: {
      img: ['src', 'alt'],
    },
  });

  return (
    <>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <div className={`my-4 ${styles.mainpageright}`}>
          <div className="d-flex flex-row">
            <div className={`left d-flex flex-column ${styles.width60}`}>
              {/* Personal */}
              <div className={`personal bg-white border ${styles.allRound}`}>
                <div
                  className={`d-flex border-bottom py-3 px-4 ${styles.topRadius}`}
                >
                  <h3>{t('personalInfoHeading')}</h3>
                </div>
                <div className="d-flex flex-row flex-wrap py-3 px-3">
                  <div>
                    <p className="my-0 mx-2">{tCommon('firstName')}</p>
                    <input
                      value={formState.firstName}
                      className={`rounded border-0 p-2 m-2 ${styles.inputColor}`}
                      type="text"
                      name="firstName"
                      onChange={handleChange}
                      required
                      placeholder={tCommon('firstName')}
                    />
                  </div>
                  <div>
                    <p className="my-0 mx-2">{tCommon('lastName')}</p>
                    <input
                      value={formState.lastName}
                      className={`rounded border-0 p-2 m-2 ${styles.inputColor}`}
                      type="text"
                      name="lastName"
                      onChange={handleChange}
                      required
                      placeholder={tCommon('lastName')}
                    />
                  </div>
                  <div>
                    <p className="my-0 mx-2">{t('gender')}</p>
                    <div className="w-100">
                      <DynamicDropDown
                        formState={formState}
                        setFormState={setFormState}
                        fieldOptions={genderEnum} // Pass your options array here
                        fieldName="gender" // Label for the field
                      />
                    </div>
                  </div>
                  <div>
                    <p className="my-0 mx-2">{t('birthDate')}</p>
                    <div>
                      <DatePicker
                        // label={t('birthDate')}
                        className={styles.datebox}
                        value={dayjs(formState.birthDate)}
                        onChange={handleDateChange}
                        data-testid="birthDate"
                        slotProps={{
                          textField: {
                            inputProps: {
                              'data-testid': 'birthDate',
                            },
                          },
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="my-0 mx-2">{t('educationGrade')}</p>
                    <DynamicDropDown
                      formState={formState}
                      setFormState={setFormState}
                      fieldOptions={educationGradeEnum} // Pass your options array here
                      fieldName="grade" // Label for the field
                    />
                  </div>
                  <div>
                    <p className="my-0 mx-2">{t('employmentStatus')}</p>
                    <DynamicDropDown
                      formState={formState}
                      setFormState={setFormState}
                      fieldOptions={employmentStatusEnum} // Pass your options array here
                      fieldName="empStatus" // Label for the field
                    />
                  </div>
                  <div>
                    <p className="my-0 mx-2">{t('maritalStatus')}</p>
                    <DynamicDropDown
                      formState={formState}
                      setFormState={setFormState}
                      fieldOptions={maritalStatusEnum} // Pass your options array here
                      fieldName="maritalStatus" // Label for the field
                    />
                  </div>
                  <p className="my-0 mx-2 w-100">
                    <label htmlFor="orgphoto" className={styles.orgphoto}>
                      {tCommon('displayImage')}:
                      <Form.Control
                        className="w-75"
                        accept="image/*"
                        id="orgphoto"
                        name="photo"
                        type="file"
                        multiple={false}
                        onChange={async (
                          e: React.ChangeEvent,
                        ): Promise<void> => {
                          const target = e.target as HTMLInputElement;
                          const image = target.files && target.files[0];
                          if (image)
                            setFormState({
                              ...formState,
                              image: await convertToBase64(image),
                            });
                        }}
                        data-testid="organisationImage"
                      />
                    </label>
                  </p>
                </div>
              </div>
              {/* Contact Info */}
              <div
                className={`contact mt-5 bg-white border ${styles.allRound}`}
              >
                <div
                  className={`d-flex border-bottom py-3 px-4 ${styles.topRadius}`}
                >
                  <h3>{t('contactInfoHeading')}</h3>
                </div>
                <div className="d-flex flex-row flex-wrap py-3 px-3">
                  <div>
                    <p className="my-0 mx-2">{t('phone')}</p>
                    <input
                      value={formState.phoneNumber}
                      className={`rounded border-0 p-2 m-2 ${styles.inputColor}`}
                      type="number"
                      name="phoneNumber"
                      onChange={handleChange}
                      placeholder={t('phone')}
                    />
                  </div>
                  <div className="w-50 p-2">
                    <p className="my-0">{tCommon('email')}</p>
                    <input
                      value={formState.email}
                      className={`w-100 rounded border-0 p-2 ${styles.inputColor}`}
                      type="email"
                      name="email"
                      onChange={handleChange}
                      required
                      placeholder={tCommon('email')}
                    />
                  </div>
                  <div className="p-2" style={{ width: `82%` }}>
                    <p className="my-0">{tCommon('address')}</p>
                    <input
                      value={formState.address}
                      className={`w-100 rounded border-0 p-2 ${styles.inputColor}`}
                      type="email"
                      name="address"
                      onChange={handleChange}
                      placeholder={tCommon('address')}
                    />
                  </div>
                  <div className="w-25 p-2">
                    <p className="my-0">{t('countryCode')}</p>
                    <input
                      value={formState.country}
                      className={`w-100 rounded border-0 p-2 ${styles.inputColor}`}
                      type="text"
                      name="country"
                      onChange={handleChange}
                      placeholder={t('countryCode')}
                    />
                  </div>
                  <div className="w-25 p-2">
                    <p className="my-0">{t('city')}</p>
                    <input
                      value={formState.city}
                      className={`w-100 rounded border-0 p-2 ${styles.inputColor}`}
                      type="text"
                      name="city"
                      onChange={handleChange}
                      placeholder={t('city')}
                    />
                  </div>
                  <div className="w-25 p-2">
                    <p className="my-0">{t('state')}</p>
                    <input
                      value={formState.state}
                      className={`w-100 rounded border-0 p-2 ${styles.inputColor}`}
                      type="text"
                      name="state"
                      onChange={handleChange}
                      placeholder={t('state')}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div
              className={`right d-flex flex-column mx-auto px-3 ${styles.maxWidth40}`}
            >
              {/* Personal */}
              <div className={`personal bg-white border ${styles.allRound}`}>
                <div
                  className={`d-flex flex-column border-bottom py-3 px-4 ${styles.topRadius}`}
                >
                  <h3>{t('personalDetailsHeading')}</h3>
                </div>
                <div className="d-flex flex-row p-4">
                  <div className="d-flex flex-column">
                    {formState.image ? (
                      <img
                        className={`rounded-circle mx-auto`}
                        style={{ width: '80px', aspectRatio: '1/1' }}
                        src={sanitizedSrc}
                        data-testid="userImagePresent"
                      />
                    ) : (
                      <>
                        <Avatar
                          name={`${userData?.user?.firstName} ${userData?.user?.lastName}`}
                          alt="User Image"
                          size={100}
                          dataTestId="userImageAbsent"
                          radius={50}
                        />
                      </>
                    )}
                  </div>
                  <div className="d-flex flex-column mx-2">
                    <p className="fs-2 my-0 fw-medium">
                      {formState?.firstName}
                    </p>
                    <div
                      className={`p-1 bg-white border border-success text-success text-center rounded mt-1 ${styles.WidthFit}`}
                    >
                      <p className="p-0 m-0 fs-6">
                        {userData?.appUserProfile?.isSuperAdmin
                          ? 'Super Admin'
                          : userData?.appUserProfile?.adminFor.length > 0
                            ? 'Admin'
                            : 'User'}
                      </p>
                    </div>
                    <p className="my-0">{formState.email}</p>
                    <p className="my-0">
                      <CalendarIcon />
                      Joined on {prettyDate(userData?.user?.createdAt)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div
                className={`mt-4 personal bg-white border ${styles.allRound}`}
              >
                <div
                  className={`d-flex flex-column border-bottom py-3 px-4 ${styles.topRadius}`}
                >
                  <h3>Tags</h3>
                </div>
                <div
                  className="px-4 bg-light-grey"
                  style={{
                    maxHeight: '200px',
                    overflowY: 'auto',
                    backgroundColor: '#f5f5f5',
                  }}
                >
                  {userData.user.tagsAssigned.map((tag: any, index: number) => (
                    <div
                      key={tag.id}
                      className="d-flex justify-content-between align-items-center mb-2 mt-2 pt-2 pb-3"
                      style={{
                        borderBottom:
                          index < userData.user.tagsAssigned.length - 1
                            ? '1px solid #e0e0e0'
                            : 'none', // No border for the last element
                      }}
                    >
                      {/* Use Link component for navigation */}
                      <Link
                        to={`/orgtags/${userData.user.orgId}/managetag/${tag._id}`}
                        className={styles.tagLink}
                      >
                        <i className="fa fa-tag mx-2" /> {tag.name}
                      </Link>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => {
                          setUnassignTagId(tag._id);
                          toggleUnassignTagModal();
                        }}
                      >
                        Unassign
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div
                className={`personal mt-4 bg-white border ${styles.allRound}`}
              >
                <div
                  className={`d-flex flex-column border-bottom py-3 px-4 ${styles.topRadius}`}
                >
                  <h3>{t('actionsHeading')}</h3>
                </div>
                <div className="p-3">
                  <div className="toggles">
                    <div className="d-flex flex-row">
                      <input
                        type="checkbox"
                        name="pluginCreationAllowed"
                        className={`mx-2 ${styles.noOutline}`}
                        checked={formState.pluginCreationAllowed}
                        onChange={handleToggleChange} // API not supporting this feature
                        data-testid="pluginCreationAllowed"
                        placeholder="pluginCreationAllowed"
                      />
                      <p className="p-0 m-0">
                        {`${t('pluginCreationAllowed')} (API not supported yet)`}
                      </p>
                    </div>
                  </div>
                  <div className="buttons d-flex flex-row gap-3 mt-2">
                    <div className={styles.dispflex}>
                      <div>
                        <label>
                          {t('appLanguageCode')} <br />
                          <select
                            className="form-control"
                            data-testid="applangcode"
                            onChange={(e): void => {
                              setFormState({
                                ...formState,
                                appLanguageCode: e.target.value,
                              });
                            }}
                            value={formState.appLanguageCode}
                          >
                            {languages.map((language, index: number) => (
                              <option key={index} value={language.code}>
                                {language.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </div>
                    <div className="d-flex flex-column">
                      <label htmlFor="">
                        {t('deleteUser')}
                        <br />
                        {`(API not supported yet)`}
                      </label>
                      <Button
                        className="btn btn-danger"
                        data-testid="deleteBtn"
                      >
                        {t('deleteUser')}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="buttons mt-4">
                <Button
                  type="button"
                  className={styles.greenregbtn}
                  value="savechanges"
                  onClick={loginLink}
                >
                  {tCommon('saveChanges')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </LocalizationProvider>

      {/* Unassign Tag Modal */}
      <Modal
        size="sm"
        id={`unassignTagModal`}
        show={unassignTagModalIsOpen}
        onHide={toggleUnassignTagModal}
        backdrop="static"
        keyboard={false}
        centered
      >
        <Modal.Header closeButton className="bg-primary">
          <Modal.Title className="text-white" id={`unassignTag`}>
            {t('unassignUserTag')}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>{t('unassignUserTagMessage')}</Modal.Body>
        <Modal.Footer>
          <Button
            type="button"
            className="btn btn-danger"
            data-dismiss="modal"
            onClick={toggleUnassignTagModal}
            data-testid="unassignTagModalCloseBtn"
          >
            {tCommon('no')}
          </Button>
          <Button
            type="button"
            className="btn btn-success"
            onClick={handleUnassignTag}
            data-testid="unassignTagModalSubmitBtn"
          >
            {tCommon('yes')}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};
export const prettyDate = (param: string): string => {
  const date = new Date(param);
  if (date?.toDateString() === 'Invalid Date') {
    return 'Unavailable';
  }
  const day = date.getDate();
  const month = date.toLocaleString('default', { month: 'long' });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};
export const getLanguageName = (code: string): string => {
  let language = 'Unavailable';
  languages.map((data) => {
    if (data.code == code) {
      language = data.name;
    }
  });
  return language;
};
export default MemberDetail;
