// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import {
    getMoveCallTransaction,
    getPublishTransaction,
    getTransactionKindName,
    getTransactions,
    getTransactionSender,
    getTransferObjectTransaction,
    getMovePackageContent,
    getObjectId,
    SUI_TYPE_ARG,
    getExecutionStatusType,
    getTotalGasUsed,
    getExecutionStatusError,
    type SuiTransactionResponse,
} from '@mysten/sui.js';
import clsx from 'clsx';
import { useState } from 'react';

import { ErrorBoundary } from '../../components/error-boundary/ErrorBoundary';
import {
    eventToDisplay,
    getAddressesLinks,
} from '../../components/events/eventDisplay';
import Longtext from '../../components/longtext/Longtext';
import ModulesWrapper from '../../components/module/ModulesWrapper';
import {
    type LinkObj,
    TxAddresses,
} from '../../components/transaction-card/TxCardUtils';
import { getAmount } from '../../utils/getAmount';
import TxLinks from './TxLinks';

import type { Category } from './TransactionResultType';
import type { TransactionKindName, SuiTransactionKind } from '@mysten/sui.js';
import type { ReactNode } from 'react';

import styles from './TransactionResult.module.css';

import { CoinFormat, useFormatCoin } from '~/hooks/useFormatCoin';
import { Banner } from '~/ui/Banner';
import { DateCard } from '~/ui/DateCard';
import { DescriptionList, DescriptionItem } from '~/ui/DescriptionList';
import { ObjectLink } from '~/ui/InternalLink';
import { PageHeader } from '~/ui/PageHeader';
import { SenderRecipient } from '~/ui/SenderRecipient';
import { StatAmount } from '~/ui/StatAmount';
import { TableHeader } from '~/ui/TableHeader';
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '~/ui/Tabs';
import { Text } from '~/ui/Text';
import { Tooltip } from '~/ui/Tooltip';
import { ReactComponent as ChevronDownIcon } from '~/ui/icons/chevron_down.svg';
import { LinkWithQuery } from '~/ui/utils/LinkWithQuery';

function generateMutatedCreated(tx: SuiTransactionResponse) {
    return [
        ...(tx.effects.mutated?.length
            ? [
                  {
                      label: 'Updated',
                      links: tx.effects.mutated.map((item) => item.reference),
                  },
              ]
            : []),
        ...(tx.effects.created?.length
            ? [
                  {
                      label: 'Created',
                      links: tx.effects.created?.map((item) => item.reference),
                  },
              ]
            : []),
    ];
}

function formatByTransactionKind(
    kind: TransactionKindName | undefined,
    data: SuiTransactionKind,
    sender: string
) {
    switch (kind) {
        case 'TransferObject':
            const transfer = getTransferObjectTransaction(data)!;
            return {
                title: 'Transfer',
                sender: {
                    value: sender,
                    link: true,
                    category: 'address',
                },
                objectId: {
                    value: transfer.objectRef.objectId,
                    link: true,
                    category: 'object',
                },
                recipient: {
                    value: transfer.recipient,
                    category: 'address',
                    link: true,
                },
            };
        case 'Call':
            const moveCall = getMoveCallTransaction(data)!;
            return {
                title: 'Call',
                sender: {
                    value: sender,
                    link: true,
                    category: 'address',
                },
                package: {
                    // TODO: Simplify after v0.24.0 launched everywhere, when
                    // moveCall.package is always an ObjectID (a string)
                    value:
                        typeof moveCall.package === 'string'
                            ? moveCall.package
                            : getObjectId(moveCall.package),
                    link: true,
                    category: 'object',
                },
                module: {
                    value: moveCall.module,
                },
                function: {
                    value: moveCall.function,
                },
                arguments: {
                    value: moveCall.arguments,
                    list: true,
                },
                typeArguments: {
                    value: moveCall.typeArguments,
                    list: true,
                },
            };
        case 'Publish':
            const publish = getPublishTransaction(data)!;
            return {
                title: 'publish',
                module: {
                    value: Object.entries(getMovePackageContent(publish)!),
                },
                ...(sender
                    ? {
                          sender: {
                              value: sender,
                              link: true,
                              category: 'address',
                          },
                      }
                    : {}),
            };

        default:
            return {};
    }
}

type TxItemView = {
    title: string;
    titleStyle?: string;
    content: {
        label?: string | number | any;
        value: ReactNode;
        link?: boolean;
        category?: string;
        monotypeClass?: boolean;
        href?: string;
    }[];
};

function ItemView({ data }: { data: TxItemView }) {
    return (
        <div className={styles.itemView}>
            <div
                className={
                    data.titleStyle
                        ? styles[data.titleStyle]
                        : styles.itemviewtitle
                }
            >
                {data.title}
            </div>
            <div className={styles.itemviewcontent}>
                {data.content.map((item, index) => {
                    // handle sender -> recipient display in one line
                    let links: LinkObj[] = [];
                    let label = item.label;
                    if (Array.isArray(item)) {
                        links = getAddressesLinks(item);
                        label = 'Sender, Recipient';
                    }

                    return (
                        <div
                            key={index}
                            className={clsx(
                                styles.itemviewcontentitem,
                                label && styles.singleitem
                            )}
                        >
                            {label && (
                                <div className={styles.itemviewcontentlabel}>
                                    {label}
                                </div>
                            )}
                            <div
                                className={clsx(
                                    styles.itemviewcontentvalue,
                                    item.monotypeClass && styles.mono
                                )}
                            >
                                {links.length > 1 && (
                                    <TxAddresses content={links} />
                                )}
                                {item.link ? (
                                    <Longtext
                                        text={item.value as string}
                                        category={item.category as Category}
                                        isLink
                                        copyButton="16"
                                    />
                                ) : item.href ? (
                                    <LinkWithQuery
                                        to={item.href}
                                        className={styles.customhreflink}
                                    >
                                        {item.value}
                                    </LinkWithQuery>
                                ) : (
                                    item.value
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function GasAmount({
    amount,
    expandable,
    expanded,
}: {
    amount?: bigint | number;
    expandable?: boolean;
    expanded?: boolean;
}) {
    const [formattedAmount, symbol] = useFormatCoin(
        amount,
        SUI_TYPE_ARG,
        CoinFormat.FULL
    );

    return (
        <div className="flex h-full items-center gap-1">
            <div className="flex items-baseline gap-0.5 text-gray-90">
                <Text variant="body/medium">{formattedAmount}</Text>
                <Text variant="subtitleSmall/medium">{symbol}</Text>
            </div>

            <Text variant="bodySmall/medium">
                <div className="flex items-center text-steel">
                    (
                    <div className="flex items-baseline gap-0.5">
                        <div>{amount?.toLocaleString()}</div>
                        <Text variant="subtitleSmall/medium">MIST</Text>
                    </div>
                    )
                </div>
            </Text>

            {expandable && (
                <ChevronDownIcon
                    height={12}
                    width={12}
                    className={clsx('text-steel', expanded && 'rotate-180')}
                />
            )}
        </div>
    );
}

function TransactionView({
    transaction,
}: {
    transaction: SuiTransactionResponse;
}) {
    const txdetails = getTransactions(transaction.certificate)[0];
    const txKindName = getTransactionKindName(txdetails);
    const sender = getTransactionSender(transaction.certificate);
    const gasUsed = transaction?.effects.gasUsed;

    const [gasFeesExpanded, setGasFeesExpanded] = useState(false);

    const txnTransfer = getAmount(txdetails, transaction?.effects);
    const sendReceiveRecipients = txnTransfer?.map((item) => ({
        address: item.recipientAddress,
        ...(item?.amount
            ? {
                  coin: {
                      amount: item.amount,
                      coinType: item?.coinType || null,
                  },
              }
            : {}),
    }));

    const [formattedAmount, symbol] = useFormatCoin(
        txnTransfer?.[0].amount,
        txnTransfer?.[0].coinType
    );

    const txKindData = formatByTransactionKind(txKindName, txdetails, sender);

    const txEventData = transaction.effects.events?.map(eventToDisplay);

    let eventTitles: [string, string][] = [];
    const txEventDisplay = txEventData?.map((ed, index) => {
        if (!ed) return <div />;

        let key = ed.top.title + index;
        eventTitles.push([ed.top.title, key]);
        return (
            <div className={styles.txgridcomponent} key={key}>
                <ItemView data={ed.top as TxItemView} />
                {ed.fields && <ItemView data={ed.fields as TxItemView} />}
            </div>
        );
    });

    let eventTitlesDisplay = eventTitles.map(([title, key]) => (
        <div key={key} className={styles.eventtitle}>
            {title}
        </div>
    ));

    const transactionSignatureData = {
        title: 'Transaction Signatures',
        content: [
            {
                label: 'Signature',
                value: transaction.certificate.txSignature,
                monotypeClass: true,
            },
        ],
    };

    let validatorSignatureData;
    if (Array.isArray(transaction.certificate.authSignInfo.signature)) {
        validatorSignatureData = {
            title: 'Validator Signatures',
            content: transaction.certificate.authSignInfo.signature.map(
                (validatorSign, index) => ({
                    label: `Signature #${index + 1}`,
                    value: validatorSign,
                    monotypeClass: true,
                })
            ),
        };
    } else {
        validatorSignatureData = {
            title: 'Aggregated Validator Signature',
            content: [
                {
                    label: `Signature`,
                    value: transaction.certificate.authSignInfo.signature,
                    monotypeClass: true,
                },
            ],
        };
    }

    const createdMutateData = generateMutatedCreated(transaction);

    const typearguments =
        txKindData.title === 'Call' && txKindData.package
            ? {
                  title: 'Package Details',
                  content: [
                      {
                          label: 'Package ID',
                          monotypeClass: true,
                          link: true,
                          category: 'object',
                          value: txKindData.package.value,
                      },
                      {
                          label: 'Module',
                          monotypeClass: true,
                          value: txKindData.module.value,
                          href: `/object/${txKindData.package.value}?module=${txKindData.module.value}`,
                      },
                      {
                          label: 'Function',
                          monotypeClass: true,
                          value: txKindData.function.value,
                      },
                      {
                          label: 'Argument',
                          monotypeClass: true,
                          value: JSON.stringify(txKindData.arguments.value),
                      },
                  ],
              }
            : false;

    if (typearguments && txKindData.typeArguments?.value) {
        typearguments.content.push({
            label: 'Type Arguments',
            monotypeClass: true,
            value: JSON.stringify(txKindData.typeArguments.value),
        });
    }

    const modules =
        txKindData?.module?.value && Array.isArray(txKindData?.module?.value)
            ? {
                  title: 'Modules',
                  content: txKindData?.module?.value,
              }
            : false;

    const hasEvents = txEventData && txEventData.length > 0;

    const txError = getExecutionStatusError(transaction);

    return (
        <div className={clsx(styles.txdetailsbg)}>
            <div className="mt-5 mb-10">
                <PageHeader
                    type={txKindName}
                    title={transaction.certificate.transactionDigest}
                    status={getExecutionStatusType(transaction)}
                />
                {txError && (
                    <div className="mt-2">
                        <Banner variant="error">{txError}</Banner>
                    </div>
                )}
            </div>
            <TabGroup size="lg">
                <TabList>
                    <Tab>Details</Tab>
                    {hasEvents && <Tab>Events</Tab>}
                    <Tab>Signatures</Tab>
                </TabList>
                <TabPanels>
                    <TabPanel>
                        <div
                            className={styles.txgridcomponent}
                            // TODO: Change to test ID
                            id={transaction.certificate.transactionDigest}
                        >
                            {typearguments && (
                                <section
                                    className={clsx([
                                        styles.txcomponent,
                                        styles.txgridcolspan2,
                                        styles.packagedetails,
                                    ])}
                                >
                                    <ItemView data={typearguments} />
                                </section>
                            )}
                            <section
                                className={clsx([
                                    styles.txcomponent,
                                    styles.txsender,
                                    'md:ml-4',
                                ])}
                                data-testid="transaction-timestamp"
                            >
                                {txnTransfer?.[0].amount ? (
                                    <section className="mb-10">
                                        <StatAmount
                                            amount={formattedAmount}
                                            symbol={symbol}
                                            date={transaction.timestamp_ms}
                                        />
                                    </section>
                                ) : (
                                    transaction.timestamp_ms && (
                                        <div className="mb-3">
                                            <DateCard
                                                date={transaction.timestamp_ms}
                                            />
                                        </div>
                                    )
                                )}
                                <SenderRecipient
                                    sender={sender}
                                    transferCoin={txnTransfer?.[0].isCoin}
                                    recipients={sendReceiveRecipients}
                                />
                            </section>

                            <section
                                className={clsx([
                                    styles.txcomponent,
                                    styles.txgridcolspan2,
                                ])}
                            >
                                <div className={styles.txlinks}>
                                    {createdMutateData.map((item, idx) => (
                                        <TxLinks data={item} key={idx} />
                                    ))}
                                </div>
                            </section>

                            {modules && (
                                <section
                                    className={clsx([
                                        styles.txcomponent,
                                        styles.txgridcolspan3,
                                    ])}
                                >
                                    <ErrorBoundary>
                                        <ModulesWrapper
                                            id={txKindData.objectId?.value}
                                            data={modules}
                                        />
                                    </ErrorBoundary>
                                </section>
                            )}
                        </div>
                        <div data-testid="gas-breakdown" className="mt-8">
                            <TableHeader>Gas & Storage Fees</TableHeader>

                            <DescriptionList>
                                <DescriptionItem title="Gas Payment">
                                    <ObjectLink
                                        noTruncate
                                        objectId={
                                            transaction.certificate.data
                                                .gasPayment.objectId
                                        }
                                    />
                                </DescriptionItem>

                                <DescriptionItem title="Gas Budget">
                                    <GasAmount
                                        amount={
                                            transaction.certificate.data
                                                .gasBudget
                                        }
                                    />
                                </DescriptionItem>

                                {gasFeesExpanded && (
                                    <>
                                        <DescriptionItem title="Computation Fee">
                                            <GasAmount
                                                amount={
                                                    gasUsed?.computationCost
                                                }
                                            />
                                        </DescriptionItem>

                                        <DescriptionItem title="Storage Fee">
                                            <GasAmount
                                                amount={gasUsed?.storageCost}
                                            />
                                        </DescriptionItem>

                                        <DescriptionItem title="Storage Rebate">
                                            <GasAmount
                                                amount={gasUsed?.storageRebate}
                                            />
                                        </DescriptionItem>

                                        <div className="h-px bg-gray-45" />
                                    </>
                                )}

                                <DescriptionItem
                                    title={
                                        <Text
                                            variant="body/semibold"
                                            color="steel-darker"
                                        >
                                            Total Gas Fee
                                        </Text>
                                    }
                                >
                                    <Tooltip
                                        tip={
                                            gasFeesExpanded
                                                ? 'Hide Gas Fee breakdown'
                                                : 'Show Gas Fee breakdown'
                                        }
                                    >
                                        <button
                                            className="cursor-pointer border-none bg-inherit p-0"
                                            type="button"
                                            onClick={() =>
                                                setGasFeesExpanded(
                                                    (expanded) => !expanded
                                                )
                                            }
                                        >
                                            <GasAmount
                                                amount={getTotalGasUsed(
                                                    transaction
                                                )}
                                                expanded={gasFeesExpanded}
                                                expandable
                                            />
                                        </button>
                                    </Tooltip>
                                </DescriptionItem>
                            </DescriptionList>
                        </div>
                    </TabPanel>
                    {hasEvents && (
                        <TabPanel>
                            <div className={styles.txevents}>
                                <div className={styles.txeventsleft}>
                                    {eventTitlesDisplay}
                                </div>
                                <div className={styles.txeventsright}>
                                    {txEventDisplay}
                                </div>
                            </div>
                        </TabPanel>
                    )}
                    <TabPanel>
                        <div className={styles.txgridcomponent}>
                            <ItemView data={transactionSignatureData} />
                            <ItemView data={validatorSignatureData} />
                        </div>
                    </TabPanel>
                </TabPanels>
            </TabGroup>
        </div>
    );
}

export default TransactionView;
