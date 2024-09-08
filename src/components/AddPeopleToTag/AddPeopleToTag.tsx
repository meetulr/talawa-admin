import { ApolloError, useMutation, useQuery } from '@apollo/client';
import { DataGrid, GridCellParams, GridColDef } from '@mui/x-data-grid';
import Loader from 'components/Loader/Loader';
import { USER_TAGS_MEMBERS_TO_ASSIGN_TO } from 'GraphQl/Queries/userTagQueries';
import React, { ChangeEvent, useState } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import { InterfaceQueryUserTagsMembersToAssignTo } from 'utils/interfaces';
import styles from './AddPeopleToTag.module.css';
import { dataGridStyle } from 'utils/organizationTagsUtils';
import { Box, Stack } from '@mui/material';
import { toast } from 'react-toastify';
import {
  ADD_PEOPLE_TO_TAG,
  CREATE_USER_TAG,
} from 'GraphQl/Mutations/TagMutations';

/**
 * Props for the `AddPeopleToTag` component.
 */
interface InterfaceAddPeopleToTagProps {
  addPeopleToTagModalIsOpen: boolean;
  hideAddPeopleToTagModal: () => void;
  refetchAssignedMembersData: () => void;
  t: (key: string) => string;
  tCommon: (key: string) => string;
}

const AddPeopleToTag: React.FC<InterfaceAddPeopleToTagProps> = ({
  addPeopleToTagModalIsOpen,
  hideAddPeopleToTagModal,
  refetchAssignedMembersData,
  t,
  tCommon,
}) => {
  const { orgId, tagId: currentTagId } = useParams();

  const [after, setAfter] = useState<string | null | undefined>(null);
  const [before, setBefore] = useState<string | null | undefined>(null);
  const [first, setFirst] = useState<number | null>(7);
  const [last, setLast] = useState<number | null>(null);

  const [assignToMembers, setAssignToMembers] = useState<any[]>([]);

  const {
    data: userTagsMembersToAssignToData,
    loading: userTagsMembersToAssignToLoading,
    error: userTagsMembersToAssignToError,
    refetch: userTagsMembersToAssignToRefetch,
    fetchMore, // Add fetchMore here
  }: {
    data?: {
      getUserTag: InterfaceQueryUserTagsMembersToAssignTo;
    };
    loading: boolean;
    error?: ApolloError;
    refetch: () => void;
    fetchMore: (options: {
      variables: {
        after?: string | null;
        before?: string | null;
        first?: number | null;
        last?: number | null;
      };
      updateQuery?: (
        previousQueryResult: any,
        options: { fetchMoreResult: any },
      ) => any; // Add updateQuery here
    }) => Promise<any>;
  } = useQuery(USER_TAGS_MEMBERS_TO_ASSIGN_TO, {
    variables: {
      id: currentTagId,
      after: after,
      before: before,
      first: first,
      last: last,
    },
    skip: !addPeopleToTagModalIsOpen,
  });

  const loadMoreMembersToAssignTo = () => {
    if (
      userTagsMembersToAssignToData?.getUserTag.usersToAssignTo.pageInfo
        .hasNextPage
    ) {
      fetchMore({
        variables: {
          first: 7,
          after:
            userTagsMembersToAssignToData.getUserTag.usersToAssignTo.pageInfo
              .endCursor, // Fetch after the last loaded cursor
        },
        updateQuery: (prevResult, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prevResult;

          return {
            getUserTag: {
              ...fetchMoreResult.getUserTag,
              usersToAssignTo: {
                ...fetchMoreResult.getUserTag.usersToAssignTo,
                edges: [
                  ...prevResult.getUserTag.usersToAssignTo.edges,
                  ...fetchMoreResult.getUserTag.usersToAssignTo.edges,
                ],
              },
            },
          };
        },
      });
    }
  };

  const userTagMembersToAssignTo =
    userTagsMembersToAssignToData?.getUserTag.usersToAssignTo.edges.map(
      (edge) => edge.node,
    );

  const handleAddOrRemoveMember = (member: any) => {
    setAssignToMembers((prevMembers) => {
      const isAssigned = prevMembers.some((m) => m._id === member._id);
      if (isAssigned) {
        return prevMembers.filter((m) => m._id !== member._id);
      } else {
        return [...prevMembers, member];
      }
    });
  };

  const removeMember = (id: string) => {
    setAssignToMembers((prevMembers) =>
      prevMembers.filter((m) => m._id !== id),
    );
  };

  const [addPeople, { loading: addPeopleToTagLoading }] =
    useMutation(ADD_PEOPLE_TO_TAG);

  const addPeopleToCurrentTag = async (
    e: ChangeEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();

    try {
      const { data } = await addPeople({
        variables: {
          tagId: currentTagId,
          userIds: assignToMembers.map((member) => member._id),
        },
      });

      if (data) {
        toast.success(t('successfullyAssignedToPeople'));
        refetchAssignedMembersData();
        hideAddPeopleToTagModal();
        setAssignToMembers([]);
      }
    } catch (error: unknown) {
      /* istanbul ignore next */
      if (error instanceof Error) {
        toast.error(error.message);
      }
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'id',
      headerName: '#',
      minWidth: 100,
      align: 'center',
      headerAlign: 'center',
      headerClassName: `${styles.tableHeader}`,
      sortable: false,
      renderCell: (params: GridCellParams) => {
        return <div>{params.row.id}</div>;
      },
    },
    {
      field: 'userName',
      headerName: 'User Name',
      flex: 2,
      minWidth: 100,
      sortable: false,
      headerClassName: `${styles.tableHeader}`,
      renderCell: (params: GridCellParams) => {
        return (
          <div data-testid="memberName">
            {params.row.firstName + ' ' + params.row.lastName}
          </div>
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 1,
      align: 'center',
      minWidth: 100,
      headerAlign: 'center',
      sortable: false,
      headerClassName: `${styles.tableHeader}`,
      renderCell: (params: GridCellParams) => {
        const isToBeAssigned = assignToMembers.some(
          (member) => member._id === params.row._id,
        );

        return (
          <Button
            size="sm"
            onClick={() => handleAddOrRemoveMember(params.row)}
            data-testid={isToBeAssigned ? 'removeTagBtn' : 'addTagBtn'}
            variant={!isToBeAssigned ? 'primary' : 'danger'}
          >
            {isToBeAssigned ? 'x' : '+'}
          </Button>
        );
      },
    },
  ];

  return (
    <>
      <Modal
        show={addPeopleToTagModalIsOpen}
        onHide={hideAddPeopleToTagModal}
        backdrop="static"
        aria-labelledby="contained-modal-title-vcenter"
        centered
      >
        <Modal.Header
          className="bg-primary"
          data-testid="modalOrganizationHeader"
          closeButton
        >
          <Modal.Title className="text-white">{t('addPeople')}</Modal.Title>
        </Modal.Header>
        <Form onSubmitCapture={addPeopleToCurrentTag}>
          <Modal.Body>
            {userTagsMembersToAssignToLoading ? (
              <Loader />
            ) : (
              <>
                <div
                  className={`d-flex flex-wrap align-items-center border bg-light-subtle rounded-3 p-2 ${styles.scrollContainer}`}
                >
                  {assignToMembers.length === 0 ? (
                    <div className="text-center text-body-tertiary">
                      No one selected
                    </div>
                  ) : (
                    assignToMembers.map((member) => (
                      <div
                        key={member._id}
                        className={`badge bg-dark-subtle text-secondary-emphasis lh-lg my-2 ms-2 d-flex align-items-center ${styles.memberBadge}`}
                      >
                        {member.firstName} {member.lastName}
                        <i
                          className={`${styles.removeFilterIcon} fa fa-times ms-2 text-body-tertiary`}
                          onClick={() => removeMember(member._id)}
                          data-testid="clearAssignedMember"
                        />
                      </div>
                    ))
                  )}
                </div>
                <Box
                  sx={{
                    height: '300px', // Set the fixed height for the grid container
                    width: '100%', // Adjust width as needed
                  }}
                >
                  <DataGrid
                    disableColumnMenu
                    columnBufferPx={7}
                    hideFooter={true}
                    getRowId={(row) => row._id}
                    slots={{
                      noRowsOverlay: /* istanbul ignore next */ () => (
                        <Stack
                          height="100%"
                          alignItems="center"
                          justifyContent="center"
                        >
                          {t('noOneToAssign')}
                        </Stack>
                      ),
                    }}
                    sx={{
                      ...dataGridStyle,
                    }}
                    getRowClassName={() => `${styles.rowBackground}`}
                    autoHeight={false} // Ensure autoHeight is disabled
                    rowHeight={65}
                    rows={userTagMembersToAssignTo?.map(
                      (membersToAssignTo, index) => ({
                        id: index + 1,
                        ...membersToAssignTo,
                      }),
                    )}
                    columns={columns}
                    isRowSelectable={() => false}
                  />
                </Box>
                <Button
                  className="w-100 btn-sm rounded-top-0"
                  onClick={loadMoreMembersToAssignTo}
                  disabled={
                    userTagsMembersToAssignToLoading ||
                    !userTagsMembersToAssignToData?.getUserTag.usersToAssignTo
                      .pageInfo.hasNextPage
                  }
                >
                  <i className={'mx-2 fa fa-caret-down'} />
                </Button>
              </>
            )}
          </Modal.Body>

          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={(): void => hideAddPeopleToTagModal()}
              data-testid="closeAddPeopleToTagModal"
            >
              {tCommon('cancel')}
            </Button>
            <Button
              type="submit"
              value="add"
              data-testid="addPeopleToTagModalSubmitBtn"
            >
              {t('add')}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
};

export default AddPeopleToTag;
