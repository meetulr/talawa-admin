import { ApolloError, useQuery } from '@apollo/client';
import Loader from 'components/Loader/Loader';
import {
  USER_TAG_ANCESTORS,
  USER_TAG_SUB_TAGS,
} from 'GraphQl/Queries/userTagQueries';
import React, { useEffect, useState } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import {
  InterfaceQueryOrganizationUserTags,
  InterfaceQueryUserTagChildTags,
  InterfaceTagData,
} from 'utils/interfaces';
import styles from './AssignToTags.module.css';
import { ORGANIZATION_USER_TAGS_LIST } from 'GraphQl/Queries/OrganizationQueries';

/**
 * Props for the `AddPeopleToTag` component.
 */
interface InterfaceAssignToTagsProps {
  assignToTagsModalIsOpen: boolean;
  hideAssignToTagsModal: () => void;
  t: (key: string) => string;
  tCommon: (key: string) => string;
}

const AssignToTags: React.FC<InterfaceAssignToTagsProps> = ({
  assignToTagsModalIsOpen,
  hideAssignToTagsModal,
  t,
  tCommon,
}) => {
  const { orgId, tagId: currentTagId } = useParams();

  const [after, setAfter] = useState<string | null | undefined>(null);
  const [before, setBefore] = useState<string | null | undefined>(null);
  const [first, setFirst] = useState<number | null>(10);
  const [last, setLast] = useState<number | null>(null);

  const {
    data: orgUserTagsData,
    loading: orgUserTagsLoading,
    error: orgUserTagsError,
    refetch: orgUserTagsRefetch,
    fetchMore: orgUserTagsFetchMore,
  }: {
    data?: {
      organizations: InterfaceQueryOrganizationUserTags[];
    };
    loading: boolean;
    error?: ApolloError;
    refetch: () => void;
    fetchMore: any;
  } = useQuery(ORGANIZATION_USER_TAGS_LIST, {
    variables: {
      id: orgId,
      after: after,
      before: before,
      first: first,
      last: last,
    },
    skip: !assignToTagsModalIsOpen,
  });

  const userTagsList = orgUserTagsData?.organizations[0].userTags.edges.map(
    (edge) => edge.node,
  );

  const [checkedTagId, setCheckedTagId] = useState<String | null>(null);
  const [uncheckedTagId, setUnheckedTagId] = useState<String | null>(null);

  const [selectedTags, setSelectedTags] = useState<InterfaceTagData[]>([]);
  const [checkedTags, setCheckedTags] = useState<Set<string>>(new Set());
  const [addAncestorTagsData, setAddAncestorTagsData] = useState<any>(
    new Set(),
  );
  const [removeAncestorTagsData, setRemoveAncestorTagsData] = useState<any>(
    new Set(),
  );
  const [ancestorTagsDataMap, setAncestorTagsDataMap] = useState(new Map());

  useEffect(() => {
    const newCheckedTags = new Set(checkedTags);
    const newAncestorTagsDataMap = new Map(ancestorTagsDataMap);
    addAncestorTagsData.forEach((ancestorTag: any) => {
      const prevAncestorTagValue = ancestorTagsDataMap.get(ancestorTag._id);
      newAncestorTagsDataMap.set(
        ancestorTag._id,
        prevAncestorTagValue ? prevAncestorTagValue + 1 : 1,
      );
      newCheckedTags.add(ancestorTag._id);
    });

    setCheckedTags(newCheckedTags);
    setAncestorTagsDataMap(newAncestorTagsDataMap);
  }, [addAncestorTagsData]);

  useEffect(() => {
    const newCheckedTags = new Set(checkedTags);
    const newAncestorTagsDataMap = new Map(ancestorTagsDataMap);
    removeAncestorTagsData.forEach((ancestorTag: any) => {
      const prevAncestorTagValue = ancestorTagsDataMap.get(ancestorTag._id);
      if (prevAncestorTagValue === 1) {
        newCheckedTags.delete(ancestorTag._id);
        newAncestorTagsDataMap.delete(ancestorTag._id);
      } else {
        newAncestorTagsDataMap.set(ancestorTag._id, prevAncestorTagValue - 1);
      }
    });

    setCheckedTags(newCheckedTags);
    setAncestorTagsDataMap(newAncestorTagsDataMap);
  }, [removeAncestorTagsData]);

  const addAncestorTags = (tagId: string): void => {
    setCheckedTagId(tagId);
    setUnheckedTagId(null);
  };

  const removeAncestorTags = (tagId: string): void => {
    setUnheckedTagId(tagId);
    setCheckedTagId(null);
  };

  const selectTag = (tag: InterfaceTagData): void => {
    const newCheckedTags = new Set(checkedTags);

    setSelectedTags((selectedTags) => [...selectedTags, tag]);
    newCheckedTags.add(tag._id);
    addAncestorTags(tag._id);

    setCheckedTags(newCheckedTags);
  };

  const deSelectTag = (tag: InterfaceTagData): void => {
    if (!selectedTags.some((selectedTag) => selectedTag._id === tag._id)) {
      return;
    }
    
    const newCheckedTags = new Set(checkedTags);

    setSelectedTags(
      selectedTags.filter((selectedTag) => selectedTag._id !== tag._id),
    );
    newCheckedTags.delete(tag._id);
    removeAncestorTags(tag._id);

    setCheckedTags(newCheckedTags);
  };

  const toggleTagSelection = (tag: InterfaceTagData, isSelected: boolean) => {
    if (isSelected) {
      selectTag(tag);
    } else {
      deSelectTag(tag);
    }
  };

  useQuery(USER_TAG_ANCESTORS, {
    variables: { id: checkedTagId },
    onCompleted: (data) => {
      setAddAncestorTagsData(data.getUserTagAncestors.slice(0, -1)); // Update the ancestor tags data
    },
  });

  useQuery(USER_TAG_ANCESTORS, {
    variables: { id: uncheckedTagId },
    onCompleted: (data) => {
      setRemoveAncestorTagsData(data.getUserTagAncestors.slice(0, -1)); // Update the ancestor tags data
    },
  });

  const loadMoreUserTags = () => {
    if (orgUserTagsData?.organizations[0].userTags.pageInfo.hasNextPage) {
      orgUserTagsFetchMore({
        variables: {
          first: 10,
          after: orgUserTagsData.organizations[0].userTags.pageInfo.endCursor, // Fetch after the last loaded cursor
        },
        updateQuery: (
          prevResult: any,
          { fetchMoreResult }: { fetchMoreResult: any },
        ) => {
          if (!fetchMoreResult) return prevResult;

          return {
            organizations: [
              {
                ...prevResult.organizations[0],
                userTags: {
                  ...prevResult.organizations[0].userTags,
                  edges: [
                    ...prevResult.organizations[0].userTags.edges,
                    ...fetchMoreResult.organizations[0].userTags.edges,
                  ],
                  pageInfo: fetchMoreResult.organizations[0].userTags.pageInfo,
                },
              },
            ],
          };
        },
      });
    }
  };

  return (
    <>
      <Modal
        show={assignToTagsModalIsOpen}
        onHide={hideAssignToTagsModal}
        backdrop="static"
        aria-labelledby="contained-modal-title-vcenter"
        centered
      >
        <Modal.Header
          className="bg-primary"
          data-testid="modalOrganizationHeader"
          closeButton
        >
          <Modal.Title className="text-white">{t('assignToTags')}</Modal.Title>
        </Modal.Header>
        <Form>
          <Modal.Body className="pb-0">
            {orgUserTagsLoading ? (
              <Loader size="sm" />
            ) : (
              <>
                <div
                  className={`d-flex flex-wrap align-items-center border bg-light-subtle rounded-3 p-2 ${styles.scrollContainer}`}
                >
                  {selectedTags.length === 0 ? (
                    <div className="text-center text-body-tertiary">
                      No tag selected
                    </div>
                  ) : (
                    selectedTags.map((tag: any) => (
                      <div
                        key={tag._id}
                        className={`badge bg-dark-subtle text-secondary-emphasis lh-lg my-2 ms-2 d-flex align-items-center ${styles.memberBadge}`}
                      >
                        {tag.name}
                        <i
                          className={`${styles.removeFilterIcon} fa fa-times ms-2 text-body-tertiary`}
                          onClick={() => deSelectTag(tag)}
                          data-testid="clearAssignedMember"
                        />
                      </div>
                    ))
                  )}
                </div>

                <div className={`mt-4 mb-2 fs-5 ${styles.allTagsHeading}`}>
                  All Tags
                </div>

                <div className={`${styles.scrContainer}`}>
                  {userTagsList?.map((tag) => (
                    <div className="my-2" key={tag._id}>
                      <TagNode
                        tag={tag}
                        checkedTags={checkedTags}
                        toggleTagSelection={toggleTagSelection}
                      />
                    </div>
                  ))}
                  {orgUserTagsData?.organizations[0].userTags.pageInfo
                    .hasNextPage && (
                    <div
                      style={{ cursor: 'pointer' }}
                      className="ms-4 mt-0 mb-3"
                      onClick={loadMoreUserTags}
                    >
                      <span className="fw-lighter fst-italic">
                        ...fetch more
                      </span>
                      <i className={'mx-2 fa fa-angle-double-down'} />
                    </div>
                  )}
                </div>
              </>
            )}
          </Modal.Body>

          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={(): void => hideAssignToTagsModal()}
              data-testid="closeAddPeopleToTagModal"
            >
              {tCommon('cancel')}
            </Button>
            <Button
              type="submit"
              value="add"
              data-testid="addPeopleToTagModalSubmitBtn"
            >
              {t('assign')}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
};

export default AssignToTags;

function TagNode({
  tag,
  checkedTags,
  toggleTagSelection,
}: {
  tag: InterfaceTagData;
  checkedTags: Set<string>;
  toggleTagSelection: (tag: InterfaceTagData, isSelected: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [subtags, setSubtags] = useState<InterfaceTagData[] | null>(null);

  const [after, setAfter] = useState<string | null | undefined>(null);
  const [before, setBefore] = useState<string | null | undefined>(null);
  const [first, setFirst] = useState<number | null>(5);
  const [last, setLast] = useState<number | null>(null);

  const {
    data: subTagsData,
    loading: subTagsLoading,
    refetch: subTagsRefetch,
    fetchMore: fetchMoreSubTags,
  }: {
    data?: {
      getUserTag: InterfaceQueryUserTagChildTags;
    };
    loading: boolean;
    error?: ApolloError;
    refetch: any;
    fetchMore: any;
  } = useQuery(USER_TAG_SUB_TAGS, {
    variables: {
      id: tag._id,
      after: after,
      before: before,
      first: first,
      last: last,
    },
    skip: !expanded, // skip if not expanded or if subtags are already fetched
  });

  const subTagsList = subTagsData?.getUserTag.childTags.edges.map(
    (edge: any) => edge.node,
  );

  const handleTagClick = () => {
    if (!expanded) {
      setExpanded(true);
      if (!subtags) {
        // fetch subtags if they haven't been fetched yet
        subTagsRefetch().then((res: any) => {
          setSubtags(res.data.getUserTag.childTags); // assuming this is how you get subtags
        });
      }
    } else {
      setExpanded(false); // collapse on second click
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    toggleTagSelection(tag, e.target.checked);
  };

  const loadMoreSubTags = () => {
    if (subTagsData?.getUserTag.childTags.pageInfo.hasNextPage) {
      fetchMoreSubTags({
        variables: {
          first: 5,
          after: subTagsData.getUserTag.childTags.pageInfo.endCursor, // Fetch after the last loaded cursor
        },
        updateQuery: (
          prevResult: any,
          { fetchMoreResult }: { fetchMoreResult: any },
        ) => {
          if (!fetchMoreResult) return prevResult;

          return {
            getUserTag: {
              ...fetchMoreResult.getUserTag,
              childTags: {
                ...fetchMoreResult.getUserTag.childTags,
                edges: [
                  ...prevResult.getUserTag.childTags.edges,
                  ...fetchMoreResult.getUserTag.childTags.edges,
                ],
              },
            },
          };
        },
      });
    }
  };

  return (
    <div className="my-2">
      <div>
        {tag.childTags.totalCount ? (
          <>
            <span
              onClick={handleTagClick}
              className="me-3"
              style={{ cursor: 'pointer' }}
            >
              {expanded ? '▼' : '▶'}
            </span>
            <input
              style={{ cursor: 'pointer' }}
              type="checkbox"
              checked={checkedTags.has(tag._id)}
              className="me-2"
              onChange={handleCheckboxChange}
            />
            <i className="fa fa-folder mx-2" />{' '}
          </>
        ) : (
          <>
            <span className="me-3">●</span>
            <input
              style={{ cursor: 'pointer' }}
              type="checkbox"
              checked={checkedTags.has(tag._id)}
              className="ms-1 me-2"
              onChange={handleCheckboxChange}
            />
            <i className="fa fa-tag mx-2" />{' '}
          </>
        )}

        {tag.name}
      </div>

      {expanded && subTagsLoading && (
        <div className="ms-5">Loading subtags...</div>
      )}
      {expanded && subTagsList && (
        <div style={{ marginLeft: '20px' }}>
          {subTagsList.map((tag: any) => (
            // <TagTree key={subtag._id} tag={subtag} /> // Recursive call
            <TagNode
              key={tag._id}
              tag={tag}
              checkedTags={checkedTags}
              toggleTagSelection={toggleTagSelection}
            />
          ))}
          {subTagsData?.getUserTag.childTags.pageInfo.hasNextPage && (
            <div
              style={{ cursor: 'pointer' }}
              className="ms-4 mt-0 mb-3"
              onClick={loadMoreSubTags}
            >
              <span className="fw-lighter fst-italic">...fetch more</span>
              <i className={'mx-2 fa fa-angle-double-down'} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
