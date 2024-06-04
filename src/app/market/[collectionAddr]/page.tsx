"use client";
import { Suspense, useContext, useEffect, useMemo, useState } from "react";
import { NextPage } from "next";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";

import { FiFilter } from "react-icons/fi";
import { BiSearch } from "react-icons/bi";

import MainPageLayout from "@/components/Layout";
import TabsTip from "@/components/TabsTip";
import NFTCard from "@/components/NFTCard";
import CollectionDetail from "@/components/CollectionDetail";
import CollectionItemSkeleton from "@/components/CollectionItemSkeleton";
import CollectionFilterSelect from "@/components/CollectionFilterSelect";
import CollectionFilterSidebar from "@/components/CollectionFilterSidebar";

import { NFTDataContext } from "@/contexts/NFTDataContext";

import { collectionItems } from "@/data/collectionItems";
import { collectionFilterOptions } from "@/data/selectTabData";
import { collectionTableData } from "@/data/collectionTableData";
import { collectionDataType } from "@/types/types";

const Market: NextPage = () => {
  const { publicKey, connected } = useWallet();
  const params = useParams();
  const { collectionAddr } = params;
  const { ownNFTs, getOwnNFTsState } = useContext(NFTDataContext);

  const memoizedOwnNFTs = useMemo(() => ownNFTs, [ownNFTs]);
  const [collectionData, setCollectionData] = useState<collectionDataType>();
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    if (collectionAddr) {
      const collection = collectionTableData.filter(
        (item) => item.collectionAddr === collectionAddr
      );
      setCollectionData(collection[0]);
    }
  }, [collectionAddr]);

  return (
    <MainPageLayout>
      <div
        className={`w-full flex items-start justify-start flex-row ${
          !connected && "hidden"
        }`}
      >
        <CollectionFilterSidebar
          filterOpen={filterOpen}
          onClosebar={() => setFilterOpen(false)}
        />
        <div className="w-full flex items-start justify-start mt-5 gap-4 flex-col px-2">
          {collectionData && (
            <CollectionDetail collectionData={collectionData} />
          )}
          <Suspense fallback={<div />}>
            <TabsTip />
          </Suspense>
          <div className="w-full flex items-center justify-between gap-3">
            <div
              className={`p-2 ${
                filterOpen
                  ? "bg-pink-500 text-white"
                  : "bg-gray-700 text-gray-300"
              } rounded-md hover:text-white duration-300 cursor-pointer`}
              onClick={() => setFilterOpen(!filterOpen)}
            >
              <FiFilter />
            </div>
            <div className="w-full flex items-center justify-start px-2 rounded-md border-[1px] border-gray-600">
              <BiSearch color="white" />
              <input
                placeholder="Search items"
                className="outline-none bg-transparent w-full text-white py-1 px-1 font-thin"
              />
            </div>
            <CollectionFilterSelect options={collectionFilterOptions} />
          </div>
          <CollectionItemSkeleton />
          <div className="w-full max-h-[70vh] overflow-y-auto pb-10">
            <div
              className={`w-full grid grid-cols-2 md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-5 ${
                getOwnNFTsState && "hidden"
              }`}
            >
              {collectionItems?.map((item, index) => (
                <NFTCard
                  imgUrl={item.imgUrl}
                  tokenId={item.tokenId}
                  key={index}
                  tokenAddr={item.mintAddr}
                />
              ))}
            </div>
          </div>
          <div
            className={`${
              connected && !getOwnNFTsState && memoizedOwnNFTs.length === 0
                ? "flex"
                : "hidden"
            } items-center justify-center min-h-[70vh] w-full`}
          >
            <p className="text-gray-400 text-center">
              Nothing to show
              <br />
              Items you own will appear here in your Portfolio
            </p>
          </div>
        </div>
      </div>
      <div
        className={`${
          !publicKey ? "flex" : "hidden"
        } items-center justify-center min-h-[80vh] w-full`}
      >
        <p className="text-gray-400 text-center">
          Connect wallet to see your profile page
        </p>
      </div>
    </MainPageLayout>
  );
};

export default Market;