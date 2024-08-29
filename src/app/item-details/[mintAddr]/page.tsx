/* eslint-disable @next/next/no-img-element */

"use client";
import { useContext, useEffect, useState } from "react";
import { NextPage } from "next";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAnchorWallet } from "@solana/wallet-adapter-react";

import { TfiAnnouncement } from "react-icons/tfi";
import { MdOutlineSecurity } from "react-icons/md";
import { BiDetail } from "react-icons/bi";
import { BiLineChart } from "react-icons/bi";
import { MdOutlineLocalOffer } from "react-icons/md";

import MainPageLayout from "@/components/Layout";
import { ArrowIcon, SolanaIcon } from "@/components/SvgIcons";
import { NormalSpinner } from "@/components/Spinners";
import { errorAlert, successAlert } from "@/components/ToastGroup";
import ActivityTable from "@/components/ActivityTable";
import OfferTable from "@/components/OfferTable";

import { NFTDataContext } from "@/contexts/NFTDataContext";
import { LoadingContext } from "@/contexts/LoadingContext";
import {
  ActivityDataType,
  ButtonProps,
  OfferDataType,
  OwnNFTDataType,
} from "@/types/types";

import {
  acceptOfferPNft,
  cancelAuctionPnft,
  cancelOffer,
  claimAuctionPnft,
  listPNftForSale,
  makeOffer,
  placeBid,
  pNftDelist,
  purchasePNft,
  setPrice,
} from "@/utils/contractScript";
import {
  acceptOfferPNftApi,
  cancelAuctionApi,
  cancelOfferApi,
  claimAuctionPnftApi,
  delistNftApi,
  getAllActivitiesByMintAddrApi,
  getAllOffersByMintAddrApi,
  getBidByBidder,
  listNftApi,
  makeOfferApi,
  placeBidApi,
  purchaseNFT,
  updatePriceApi,
} from "@/utils/api";
import { CollectionContext } from "@/contexts/CollectionContext";
import { ModalContext } from "@/contexts/ModalContext";
import AuctionModal from "@/components/Modal/AuctionModal";
import Countdown from "@/components/CountDown";

const ItemDetails: NextPage = () => {
  const route = useRouter();
  const router = useParams();
  const typeParam = useSearchParams().get("type");
  const { mintAddr } = router;
  const wallet = useAnchorWallet();

  const [openAboutTag, setOpenAboutTag] = useState<Boolean>(false);
  const [openOfferTable, setOpenOfferTable] = useState<Boolean>(false);
  const [openAttributeTag, setOpenAttributeTag] = useState<Boolean>(false);
  const [openDetailTag, setOpenDetailTag] = useState<Boolean>(false);
  const [openActivityTag, setOpenActivityTag] = useState<Boolean>(false);
  const [itemDetail, setItemDetail] = useState<OwnNFTDataType>();
  const [offerData, setOfferData] = useState<OfferDataType[]>([]);
  const [activityData, setActivityData] = useState<ActivityDataType[]>([]);
  const [updatedPrice, setUpdatedPrice] = useState(0);
  const [bidPrice, setBidPrice] = useState(0);

  const {
    myBalance,
    ownNFTs,
    listedAllNFTs,
    allAuctions,
    getAllListedNFTsBySeller,
    getAllListedNFTs,
    getOwnNFTs,
  } = useContext(NFTDataContext);
  const { openFunctionLoading, closeFunctionLoading } =
    useContext(LoadingContext);
  const { openAuctionModal, closeAuctionModal, auctionModalShow } =
    useContext(ModalContext);
  const { getAllCollectionData } = useContext(CollectionContext);

  useEffect(() => {
    if (ownNFTs.length === 0) {
      const item = listedAllNFTs.filter((items) => items.mintAddr === mintAddr);
      setItemDetail(item[0]);
    } else {
      if (ownNFTs.some((items) => items.mintAddr === mintAddr)) {
        const item = ownNFTs.filter((items) => items.mintAddr === mintAddr);
        setItemDetail(item[0]);
      } else {
        const item = listedAllNFTs.filter(
          (items) => items.mintAddr === mintAddr
        );
        setItemDetail(item[0]);
      }
    }
  }, [ownNFTs, mintAddr, listedAllNFTs]);

  useEffect(() => {
    if (itemDetail && wallet) {
      const fetchData = async () => {
        try {
          const res = await getBidByBidder(
            wallet?.publicKey,
            itemDetail.mintAddr
          );
          setBidPrice(res.data[0].bidPrice);
        } catch (error) {
          console.log("Error fetching bid data: ", error);
        }
      };
      fetchData();
    }
  }, [itemDetail, wallet]);

  const getOfferByMintAddr = async () => {
    try {
      const data = await getAllOffersByMintAddrApi(mintAddr.toString());

      if (data.length === 0) {
        setOfferData([]);
        return;
      }

      const filteredData = data.map(
        ({
          mintAddr,
          offerPrice,
          tokenId,
          imgUrl,
          seller,
          buyer,
          active,
        }: OfferDataType) => ({
          mintAddr,
          offerPrice,
          tokenId,
          imgUrl,
          seller,
          buyer,
          active,
        })
      );

      setOfferData(filteredData);
    } catch (error) {
      console.error("Error fetching data: ", error);
    }
  };

  const getActivityByMintAddr = async () => {
    try {
      const data = await getAllActivitiesByMintAddrApi(mintAddr.toString());
      setActivityData(data);
      // You can now use the fetched data (e.g., set it in a state)
    } catch (error) {
      console.error("Error fetching data: ", error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (mintAddr) {
        try {
          await getOfferByMintAddr();
          await getActivityByMintAddr();
        } catch (error) {
          console.error("Error fetching data: ", error);
        }
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mintAddr]);

  // NFT List Function
  const handleListMyNFTFunc = async () => {
    if (!wallet || itemDetail === undefined) {
      return;
    }
    const currentPrice = itemDetail.solPrice;

    if (updatedPrice === 0) {
      errorAlert("Please enter the price.");
      return;
    }

    try {
      openFunctionLoading();

      // Update the itemDetail price
      itemDetail.solPrice = updatedPrice;

      // List the NFT for sale
      const tx = await listPNftForSale(wallet, [itemDetail]);

      if (tx) {
        const result = await listNftApi(tx.transactions, tx.listData);

        if (result.type === "success") {
          // Refresh data after successful listing
          await Promise.all([
            getOwnNFTs(),
            getAllListedNFTsBySeller(),
            getActivityByMintAddr(),
            getAllListedNFTs(),
            getAllCollectionData(),
          ]);

          successAlert("Success");
        } else {
          itemDetail.solPrice = currentPrice;
          errorAlert("Something went wrong.");
        }
      } else {
        itemDetail.solPrice = currentPrice;
        errorAlert("Something went wrong.");
      }
    } catch (e) {
      itemDetail.solPrice = currentPrice;
      console.error("Error:", e);
      errorAlert("Something went wrong.");
    } finally {
      closeFunctionLoading();
    }
  };

  // NFT Delist Function
  const handleDelistMyNFTFunc = async () => {
    if (!wallet || itemDetail === undefined) {
      return;
    }

    try {
      openFunctionLoading();

      // Delist the NFT
      const tx = await pNftDelist(wallet, [itemDetail]);

      if (tx) {
        const result = await delistNftApi(
          tx.transactions,
          tx.delistData,
          tx.mintAddrArray
        );

        if (result.type === "success") {
          // Refresh data after successful delist
          await Promise.all([
            getOwnNFTs(),
            getAllListedNFTsBySeller(),
            getActivityByMintAddr(),
            getAllListedNFTs(),
            getAllCollectionData(),
          ]);
          successAlert("Success");
        } else {
          errorAlert("Something went wrong.");
        }
      } else {
        errorAlert("Something went wrong.");
      }
    } catch (e) {
      console.error("Error:", e);
      errorAlert("Something went wrong.");
    } finally {
      closeFunctionLoading();
    }
  };

  // Listed NFT Price Update Function
  const handleUpdatePriceFunc = async () => {
    if (!wallet || itemDetail === undefined) {
      return;
    }

    const currentPrice = itemDetail.solPrice;

    if (updatedPrice === 0) {
      errorAlert("Please enter the value.");
      return;
    }

    try {
      openFunctionLoading();

      // Update the itemDetail price
      itemDetail.solPrice = updatedPrice;

      // Set the new price
      const tx = await setPrice(wallet, itemDetail);

      if (tx) {
        const result = await updatePriceApi(
          tx.transactions,
          tx.updatedPriceItems,
          tx.updatedPriceItems.mintAddr
        );

        if (result.type === "success") {
          // Refresh data after successful price update
          await Promise.all([
            getOwnNFTs(),
            getAllListedNFTsBySeller(),
            getActivityByMintAddr(),
            getAllListedNFTs(),
            getAllCollectionData(),
          ]);

          successAlert("Success");
        } else {
          itemDetail.solPrice = currentPrice;
          errorAlert("Something went wrong.");
        }
      } else {
        itemDetail.solPrice = currentPrice;
        errorAlert("Something went wrong.");
      }
    } catch (e) {
      itemDetail.solPrice = currentPrice;
      console.error("Error:", e);
      errorAlert("Something went wrong.");
    } finally {
      closeFunctionLoading();
    }
  };

  const handleMakeOffer = async () => {
    if (wallet && itemDetail !== undefined) {
      if (updatedPrice <= itemDetail.solPrice / 2) {
        errorAlert("Offer price must be bigger than the listed price.");
      } else {
        if (myBalance < updatedPrice) {
          errorAlert("You don't have enough sol.");
        } else {
          const currentPrice = itemDetail.solPrice;
          try {
            openFunctionLoading();
            itemDetail.solPrice = updatedPrice;
            const tx = await makeOffer(wallet, [itemDetail]);
            if (tx) {
              const result = await makeOfferApi(tx.transaction, tx.offerData);
              if (result.type === "success") {
                await Promise.all([
                  getOwnNFTs(),
                  getAllListedNFTsBySeller(),
                  getActivityByMintAddr(),
                  getAllListedNFTs(),
                  getAllCollectionData(),
                ]);
                closeFunctionLoading();
                successAlert("Success");
              } else {
                itemDetail.solPrice = currentPrice;
                closeFunctionLoading();
                errorAlert("Something went wrong.");
              }
            } else {
              itemDetail.solPrice = currentPrice;
              closeFunctionLoading();
              errorAlert("Something went wrong.");
            }
          } catch (e) {
            console.log("err =>", e);
            itemDetail.solPrice = currentPrice;
            errorAlert("Something went wrong.");
            closeFunctionLoading();
          }
        }
      }
    }
  };

  // Buy NFT Function
  const handleBuyNFTFunc = async () => {
    if (wallet && itemDetail !== undefined) {
      try {
        openFunctionLoading();
        const tx = await purchasePNft(wallet, [itemDetail]);
        if (tx) {
          const result = await purchaseNFT(
            tx.transactions,
            tx.purchaseData,
            tx.mintAddrArray
          );
          if (result.type === "success") {
            await Promise.all([
              getOwnNFTs(),
              getAllListedNFTsBySeller(),
              getActivityByMintAddr(),
              getAllListedNFTs(),
              getAllCollectionData(),
            ]);
            closeFunctionLoading();
            successAlert("Success");
            route.push("/me");
          } else {
            closeFunctionLoading();
            errorAlert("Something went wrong.");
          }
        } else {
          closeFunctionLoading();
          errorAlert("Something went wrong.");
        }
      } catch (e) {
        console.log("err =>", e);
        errorAlert("Something went wrong.");
        closeFunctionLoading();
      }
    }
  };

  const handleCancelOffer = async (mintAddr: string) => {
    if (wallet && mintAddr !== undefined) {
      try {
        openFunctionLoading();
        const filterOfferData = offerData.filter(
          (data) => data.mintAddr === mintAddr
        );
        const tx = await cancelOffer(wallet, filterOfferData);
        if (tx) {
          const result = await cancelOfferApi(
            tx.mintAddr,
            tx.offerData,
            tx.transaction
          );
          if (result.type === "success") {
            closeFunctionLoading();
            successAlert("Success");
            await Promise.all([
              getOwnNFTs(),
              getAllListedNFTsBySeller(),
              getActivityByMintAddr(),
              getAllListedNFTs(),
              getAllCollectionData(),
              await getOfferByMintAddr(),
            ]);
          } else {
            closeFunctionLoading();
            errorAlert("Something went wrong.");
          }
        } else {
          closeFunctionLoading();
          errorAlert("Something went wrong.");
        }
      } catch (e) {
        console.log("err =>", e);
        closeFunctionLoading();
        errorAlert("Something went wrong.");
      }
    }
  };

  const handleAcceptHighOffer = async () => {
    if (wallet && offerData.length !== 0) {
      const highestOfferData = offerData.reduce((max, data) => {
        // Only consider entries with a valid offerPrice (non-null and non-zero)
        if (
          data.offerPrice != null &&
          data.offerPrice > (max.offerPrice || 0) &&
          data.active == 1
        ) {
          return data;
        } else {
          return data;
        }
      }); // Initial max with an offerPrice of 0

      try {
        openFunctionLoading();
        const tx = await acceptOfferPNft(wallet, highestOfferData);
        if (tx) {
          const result = await acceptOfferPNftApi(
            tx.mintAddr,
            tx.offerData,
            tx.transaction
          );
          if (result.type === "success") {
            await Promise.all([
              getOwnNFTs(),
              getAllListedNFTsBySeller(),
              getActivityByMintAddr(),
              getAllListedNFTs(),
              getAllCollectionData(),
            ]);
            closeFunctionLoading();
            successAlert("Success");
            route.push("/me");
          } else {
            closeFunctionLoading();
            errorAlert("Something went wrong.");
          }
        } else {
          closeFunctionLoading();
          errorAlert("Something went wrong.");
        }
      } catch (e) {
        console.log("err =>", e);
        closeFunctionLoading();
        errorAlert("Something went wrong.");
      }
    }
  };

  // Cancel NFT Auction Function
  const handleCancelAuctionMyNFTFunc = async () => {
    const currentDate = Date.now();
    if (!wallet || itemDetail === undefined) {
      return;
    }

    if (currentDate < itemDetail?.endTime!) {
      errorAlert("The auction is not over yet.");
      return;
    }

    try {
      openFunctionLoading();

      // Delist the NFT
      const tx = await cancelAuctionPnft(wallet, itemDetail);

      if (tx) {
        const result = await cancelAuctionApi(tx.transaction, tx.delistData);

        if (result.type === "success") {
          // Refresh data after successful delist
          await Promise.all([
            getOwnNFTs(),
            getAllListedNFTsBySeller(),
            getActivityByMintAddr(),
            getAllListedNFTs(),
            getAllCollectionData(),
          ]);
          successAlert("Success");
        } else {
          errorAlert("Something went wrong.");
        }
      } else {
        errorAlert("Something went wrong.");
      }
    } catch (e) {
      console.error("Error:", e);
      errorAlert("Something went wrong.");
    } finally {
      closeFunctionLoading();
    }
  };

  // Claim NFT Auction Function
  const handleClaimAuctionNFTFunc = async () => {
    console.log("claim auction");
    const currentDate = Date.now();
    if (!wallet || itemDetail === undefined) {
      return;
    }

    // if (currentDate < itemDetail?.endTime!) {
    //   errorAlert("The auction is not over yet.");
    //   return;
    // }

    try {
      openFunctionLoading();

      // Delist the NFT
      const tx = await claimAuctionPnft(wallet, itemDetail);
      if (tx) {
        const result = await claimAuctionPnftApi(
          tx.transaction,
          tx.claimAuctionData,
          tx.mintAddrArray
        );

        if (result.type === "success") {
          // Refresh data after successful delist
          await Promise.all([
            getOwnNFTs(),
            getAllListedNFTsBySeller(),
            getActivityByMintAddr(),
            getAllListedNFTs(),
            getAllCollectionData(),
          ]);
          successAlert("Success");
        } else {
          errorAlert("Something went wrong.");
        }
      } else {
        errorAlert("Something went wrong.");
        closeFunctionLoading();
      }
    } catch (e) {
      console.error("Error:", e);
      errorAlert("Something went wrong.");
      closeFunctionLoading();
    } finally {
      closeFunctionLoading();
    }
  };

  // Place a bid for NFT Auction
  const handlePlaceBidFunc = async () => {
    if (!wallet || itemDetail === undefined) {
      return;
    }

    if (bidPrice !== 0) {
      errorAlert("You have already bid on this NFT.");
      return;
    }

    if (updatedPrice === 0) {
      errorAlert("Please input the price.");
      return;
    }

    try {
      openFunctionLoading();
      // bid for auction NFT
      const tx = await placeBid(wallet, itemDetail, updatedPrice);
      console.log("tx ==> ", tx);
      if (tx) {
        const result = await placeBidApi(tx.transaction, tx.bidData);

        if (result.type === "success") {
          // Refresh data after successful delist
          await Promise.all([
            getOwnNFTs(),
            getAllListedNFTsBySeller(),
            getActivityByMintAddr(),
            getAllListedNFTs(),
            getAllCollectionData(),
          ]);
          successAlert("Success");
        } else {
          errorAlert("Something went wrong.");
        }
      } else {
        errorAlert("Something went wrong.");
      }
    } catch (e) {
      console.error("Error:", e);
      errorAlert("Something went wrong.");
    } finally {
      closeFunctionLoading();
    }
  };

  return (
    <MainPageLayout>
      <div
        className={`w-full flex items-center justify-center min-h-screen ${
          itemDetail !== undefined && "hidden"
        }`}
      >
        <NormalSpinner width={7} height={7} />
      </div>
      <div
        className={`w-full max-w-[1240px] pt-3 pb-12 relative ${
          itemDetail === undefined && "hidden"
        }`}
      >
        <div className="w-full grid lg:grid-cols-2 grid-cols-1 gap-5 lg:gap-10 md:p-10 p-3 relative">
          <div className="w-full flex items-start justify-center">
            <div className="lg:w-[450px] relative xl:w-full w-[350px] md:w-[450px] aspect-square cursor-pointer">
              <img
                src={itemDetail?.imgUrl}
                className="rounded-lg object-cover w-full h-full"
                alt=""
              />
            </div>
          </div>
          <div className="w-full flex flex-col justify-start items-start gap-2">
            <div className="flex flex-col gap-1">
              <h1 className="text-white text-2xl">
                {itemDetail && itemDetail.collectionName}
              </h1>
              <p className="text-yellow-500 texl-md">
                {itemDetail && itemDetail.collectionName} #{itemDetail?.tokenId}
              </p>
            </div>
            <div className="w-full flex items-start justify-start gap-1 rounded-md bg-darkgreen border border-customborder flex-col p-3">
              {/* <div className="w-full flex items-center justify-between">
                <p className="md:text-md text-sm text-gray-300">List Price</p>
                <span className="md:text-md text-sm text-white">5.614 Sol</span>
              </div>
              <div className="w-full flex items-center justify-between">
                <p className="md:text-md text-sm text-gray-300">Taker Price</p>
                <span className="md:text-md text-sm text-white">5.614 Sol</span>
              </div>
              <div className="w-full flex items-center justify-between">
                <p className="md:text-md text-sm text-gray-300">
                  Royalty Price
                </p>
                <span className="md:text-md text-sm text-white">5.614 Sol</span>
              </div>
              <div className="w-full flex items-center justify-between">
                <p className="md:text-3xl text-xl text-gray-300">Total Price</p>
                <span className="md:text-3xl text-xl text-white">
                  5.614 Sol
                </span>
              </div> */}
              <p
                className={`text-left text-white text-2xl ${
                  itemDetail?.solPrice === 0 && "hidden"
                }`}
              >
                {`${
                  itemDetail?.endTime === undefined
                    ? "Listed Price"
                    : "Auction Start Price"
                }`}{" "}
                : {itemDetail?.solPrice}
                {" sol"}
              </p>
              <div
                className={`text-white ${
                  (itemDetail?.endTime === undefined ||
                    itemDetail?.endTime === 0) &&
                  "hidden"
                }`}
              >
                <Countdown timestamp={itemDetail?.endTime!} />
              </div>
              <p
                className={`text-left text-white text-md ${
                  bidPrice === 0 && "hidden"
                }`}
              >
                Your bid price is {bidPrice}
                {" sol"}
              </p>
              <div className="w-full flex items-center justify-between gap-2">
                <input
                  className={`w-full p-[5px] flex items-center placeholder:text-gray-500 outline-none text-white justify-between rounded-md border border-customborder bg-transparent
                     ${
                       typeParam === "auction" &&
                       wallet?.publicKey.toBase58() === itemDetail?.seller &&
                       "hidden"
                     }`}
                  placeholder="Input the price"
                  type="number"
                  onChange={(e) => {
                    setUpdatedPrice(Number(e.target.value));
                  }}
                />
                <UpdatePriceButton
                  wallet={wallet}
                  selectedNFT={itemDetail}
                  offerData={offerData}
                  handleUpdatePriceFunc={handleUpdatePriceFunc}
                  typeParam={itemDetail?.endTime !== undefined ? "auction" : ""}
                />
                <MakeOrCancelOfferButton
                  wallet={wallet}
                  selectedNFT={itemDetail}
                  offerData={offerData}
                  handleMakeOffer={handleMakeOffer}
                  handleCancelOffer={handleCancelOffer}
                  typeParam={itemDetail?.endTime !== undefined ? "auction" : ""}
                />
                <PlaceBidButton
                  wallet={wallet}
                  selectedNFT={itemDetail}
                  offerData={offerData}
                  handleMakeOffer={handleMakeOffer}
                  handleCancelOffer={handleCancelOffer}
                  handlePlaceBidFunc={handlePlaceBidFunc}
                  typeParam={itemDetail?.endTime !== undefined ? "auction" : ""}
                />

                <AcceptHighOfferButton
                  wallet={wallet}
                  selectedNFT={itemDetail}
                  offerData={offerData}
                  handleAcceptHighOffer={handleAcceptHighOffer}
                />
              </div>

              <div className="w-full flex items-center justify-center gap-2">
                <ListOrDelistButton
                  wallet={wallet}
                  selectedNFT={itemDetail}
                  handleListMyNFTFunc={handleListMyNFTFunc}
                  handleDelistMyNFTFunc={handleDelistMyNFTFunc}
                  handleCancelAuctionMyNFTFunc={handleCancelAuctionMyNFTFunc}
                  typeParam={itemDetail?.endTime !== undefined ? "auction" : ""}
                />
                <CreateAuctionButton
                  wallet={wallet}
                  selectedNFT={itemDetail}
                  handleCreateAuctionMyNFTFunc={openAuctionModal}
                  handleCancelAuctionMyNFTFunc={handleCancelAuctionMyNFTFunc}
                  handleClaimAuctionNFTFunc={handleClaimAuctionNFTFunc}
                  typeParam={itemDetail?.endTime !== undefined ? "auction" : ""}
                />
              </div>
              <BuyNowButton
                wallet={wallet}
                selectedNFT={itemDetail}
                handleBuyNFTFunc={handleBuyNFTFunc}
                typeParam={itemDetail?.endTime !== undefined ? "auction" : ""}
              />
            </div>
            <div
              className="w-full p-3 flex items-center justify-between rounded-md border border-customborder cursor-pointer"
              onClick={() => setOpenAboutTag(!openAboutTag)}
            >
              <span className="text-white font-bold text-md flex items-center justify-center gap-2">
                <TfiAnnouncement color="#EAB308" />
                Description
              </span>
              <span
                className={`duration-300 ${
                  openAboutTag ? "-rotate-90" : "rotate-90"
                }`}
              >
                <ArrowIcon />
              </span>
            </div>
            <div
              className={`w-full p-3 flex items-center justify-between rounded-md border border-customborder cursor-pointer text-sm text-gray-200 ${
                !openAboutTag && "hidden"
              }`}
            >
              {itemDetail && itemDetail?.description}
            </div>

            <div
              className="w-full p-3 flex items-center justify-between rounded-md border border-customborder cursor-pointer"
              onClick={() => setOpenAttributeTag(!openAttributeTag)}
            >
              <span className="text-white font-bold text-md flex items-center justify-center gap-2">
                <MdOutlineSecurity color="#EAB308" size={18} />
                Attributes
              </span>
              <span
                className={`duration-300 ${
                  openAttributeTag ? "-rotate-90" : "rotate-90"
                }`}
              >
                <ArrowIcon />
              </span>
            </div>
            <div
              className={`w-full p-3 grid grid-cols-3 gap-3 rounded-md border border-customborder ${
                !openAttributeTag && "hidden"
              }`}
            >
              {itemDetail &&
                itemDetail.attribute.map((detail, index) => (
                  <div
                    className="rounded-md bg-darkgreen border border-customborder p-2"
                    key={index}
                  >
                    <p className="text-gray-400 text-sm">{detail.trait_type}</p>
                    <span className="text-white text-sm">{detail.value}</span>
                  </div>
                ))}
            </div>

            <div
              className="w-full p-3 flex items-center justify-between rounded-md border border-customborder cursor-pointer"
              onClick={() => setOpenDetailTag(!openDetailTag)}
            >
              <span className="text-white font-bold text-md flex items-center justify-center gap-2">
                <BiDetail color="#EAB308" size={19} />
                Detail
              </span>
              <span
                className={`duration-300 ${
                  openDetailTag ? "-rotate-90" : "rotate-90"
                }`}
              >
                <ArrowIcon />
              </span>
            </div>
            <div
              className={`w-full p-3 flex items-center justify-between flex-col gap-1 rounded-md border border-customborder text-gray-400 ${
                !openDetailTag && "hidden"
              }`}
            >
              {" "}
              <div className="w-full flex items-center justify-between">
                <span>Mint Address</span>
                <a
                  href={`https://explorer.solana.com/address/${itemDetail?.mintAddr}?cluster=devnet`}
                  target="_blank"
                  rel="referrer"
                >
                  <span className="text-white flex items-center justify-center text-sm gap-1 duration-200 hover:text-gray-300">
                    <SolanaIcon />
                    {itemDetail &&
                      itemDetail.mintAddr.slice(0, 4) +
                        " ... " +
                        itemDetail.mintAddr.slice(-4)}
                  </span>
                </a>
              </div>
              <div className="w-full flex items-center justify-between">
                <span>OnChain Collection</span>
                <a
                  href={`https://explorer.solana.com/address/${itemDetail?.collectionAddr}?cluster=devnet`}
                  target="_blank"
                  rel="referrer"
                >
                  <span className="text-white flex items-center justify-center text-sm gap-1 duration-200 hover:text-gray-300">
                    <SolanaIcon />{" "}
                    {itemDetail &&
                      itemDetail.collectionAddr.slice(0, 4) +
                        " ... " +
                        itemDetail.collectionAddr.slice(-4)}
                  </span>
                </a>
              </div>
              <div className="w-full flex items-center justify-between">
                <span>Owner</span>
                <a
                  href={`https://explorer.solana.com/address/${itemDetail?.seller}?cluster=devnet`}
                  target="_blank"
                  rel="referrer"
                >
                  <span className="text-white flex items-center justify-center text-sm gap-1 duration-200 hover:text-gray-300">
                    <SolanaIcon />{" "}
                    {itemDetail &&
                      itemDetail.seller.slice(0, 4) +
                        " ... " +
                        itemDetail.seller.slice(-4)}
                  </span>
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="w-full flex items-center justify-center gap-2 flex-col md:px-10 px-3">
          <div
            className="w-full p-3 flex items-center justify-between rounded-md border border-customborder cursor-pointer "
            onClick={() => setOpenOfferTable(!openOfferTable)}
          >
            <span className="text-white font-bold text-md flex items-center justify-center gap-2">
              <MdOutlineLocalOffer color="#EAB308" size={20} />
              Offers
            </span>
            <span
              className={`duration-300 ${
                openOfferTable ? "-rotate-90" : "rotate-90"
              }`}
            >
              <ArrowIcon />
            </span>
          </div>
          <div className={`w-full ${!openOfferTable && "hidden"}`}>
            <OfferTable
              data={offerData}
              handleCancelOffer={(mintAddr: string) =>
                handleCancelOffer(mintAddr)
              }
              canCancel={true}
            />
          </div>
        </div>
        <div className="w-full flex items-center justify-center gap-2 flex-col md:px-10 px-3 mt-3">
          <div
            className="w-full p-3 flex items-center justify-between rounded-md border border-customborder cursor-pointer "
            onClick={() => setOpenActivityTag(!openActivityTag)}
          >
            <span className="text-white font-bold text-md flex items-center justify-center gap-2">
              <BiLineChart color="#EAB308" size={20} />
              Activities
            </span>
            <span
              className={`duration-300 ${
                openActivityTag ? "-rotate-90" : "rotate-90"
              }`}
            >
              <ArrowIcon />
            </span>
          </div>
          <div className={`w-full ${!openActivityTag && "hidden"}`}>
            <ActivityTable data={activityData} />
          </div>
        </div>
      </div>
      <AuctionModal nftItem={itemDetail} />
    </MainPageLayout>
  );
};

const UpdatePriceButton: React.FC<ButtonProps> = ({
  wallet,
  selectedNFT,
  offerData,
  handleUpdatePriceFunc,
  typeParam,
}) => {
  const isHidden =
    wallet?.publicKey.toBase58() !== selectedNFT?.seller ||
    selectedNFT?.solPrice === 0 ||
    offerData?.filter((data) => Number(data.active) !== 0).length !== 0 ||
    typeParam === "auction";

  return (
    <div
      className={`w-full rounded-md py-[6px] text-center bg-red-600 duration-200 hover:bg-red-700 text-white cursor-pointer flex items-center gap-2 justify-center ${
        isHidden && "hidden"
      }`}
      onClick={handleUpdatePriceFunc}
    >
      {"Update Price"}
    </div>
  );
};

const PlaceBidButton: React.FC<ButtonProps> = ({
  wallet,
  selectedNFT,
  handlePlaceBidFunc,
  typeParam,
}) => {
  const isHidden =
    wallet?.publicKey.toBase58() === selectedNFT?.seller ||
    typeParam !== "auction";
  return (
    <div
      className={`w-full rounded-md py-[6px] text-center bg-red-600 duration-200 hover:bg-red-700 text-white cursor-pointer flex items-center gap-2 justify-center ${
        isHidden && "hidden"
      }`}
      onClick={handlePlaceBidFunc}
    >
      {"Place a bid"}
    </div>
  );
};

const MakeOrCancelOfferButton: React.FC<ButtonProps> = ({
  wallet,
  selectedNFT,
  offerData,
  handleMakeOffer,
  handleCancelOffer,
  typeParam,
}) => {
  const isHidden =
    wallet?.publicKey.toBase58() === selectedNFT?.seller ||
    selectedNFT?.solPrice === 0 ||
    typeParam === "auction";
  const isActiveOffer =
    offerData?.filter(
      (data) =>
        data.buyer == wallet?.publicKey.toBase58() && Number(data.active) === 1
    ).length !== 0;

  return (
    <div
      className={`w-full rounded-md py-[6px] text-center bg-red-600 duration-200 hover:bg-red-700 text-white cursor-pointer flex items-center gap-2 justify-center ${
        isHidden && "hidden"
      }`}
      onClick={
        isActiveOffer
          ? () => {
              if (selectedNFT?.mintAddr && handleCancelOffer) {
                handleCancelOffer(selectedNFT.mintAddr.toString());
              }
            }
          : handleMakeOffer
      }
    >
      {isActiveOffer ? "Cancel Offer" : "Make Offer"}
    </div>
  );
};

const AcceptHighOfferButton: React.FC<ButtonProps> = ({
  wallet,
  selectedNFT,
  offerData,
  handleAcceptHighOffer,
}) => {
  const isHidden =
    offerData?.filter((data) => Number(data.active) !== 0).length === 0 ||
    wallet?.publicKey.toBase58() !== selectedNFT?.seller;

  return (
    <div
      className={`w-full rounded-md py-[6px] text-center bg-yellow-600 duration-200 hover:bg-yellow-700 text-white cursor-pointer ${
        isHidden && "hidden"
      }`}
      onClick={handleAcceptHighOffer}
    >
      {"Accept High Offer"}
    </div>
  );
};

const ListOrDelistButton: React.FC<ButtonProps> = ({
  wallet,
  selectedNFT,
  handleListMyNFTFunc,
  handleDelistMyNFTFunc,
  handleCancelAuctionMyNFTFunc,
  typeParam,
}) => {
  const isHidden = wallet?.publicKey.toBase58() !== selectedNFT?.seller;

  return (
    <div
      className={`w-full rounded-md py-[6px] text-center bg-yellow-600 duration-200 hover:bg-yellow-700 text-white cursor-pointer ${
        isHidden && "hidden"
      }`}
      onClick={
        selectedNFT?.solPrice === 0
          ? handleListMyNFTFunc
          : typeParam === "auction"
          ? handleCancelAuctionMyNFTFunc
          : handleDelistMyNFTFunc
      }
    >
      {selectedNFT?.solPrice === 0 &&
      wallet?.publicKey.toBase58() === selectedNFT.seller
        ? "List Now"
        : typeParam === "auction"
        ? "Cancel auction"
        : "Delist now"}
    </div>
  );
};

const CreateAuctionButton: React.FC<ButtonProps> = ({
  wallet,
  selectedNFT,
  handleCreateAuctionMyNFTFunc,
  handleClaimAuctionNFTFunc,
  typeParam,
}) => {
  const isHidden =
    wallet?.publicKey.toBase58() !== selectedNFT?.seller ||
    typeParam !== "auction";

  return (
    <div
      className={`w-full rounded-md py-[6px] text-center bg-green-600 duration-200 hover:bg-green-700 text-white cursor-pointer ${
        isHidden && "hidden"
      }`}
      onClick={
        selectedNFT?.solPrice === 0 &&
        wallet?.publicKey.toBase58() === selectedNFT.seller
          ? handleCreateAuctionMyNFTFunc
          : handleClaimAuctionNFTFunc
      }
    >
      {selectedNFT?.solPrice === 0 &&
      wallet?.publicKey.toBase58() === selectedNFT.seller
        ? "Create Auction"
        : "Claim Auction"}
    </div>
  );
};

const BuyNowButton: React.FC<ButtonProps> = ({
  wallet,
  selectedNFT,
  handleBuyNFTFunc,
  typeParam,
}) => {
  const isHidden =
    wallet?.publicKey.toBase58() === selectedNFT?.seller ||
    typeParam === "auction";

  return (
    <div
      className={`w-full rounded-md py-[6px] text-center bg-yellow-600 duration-200 hover:bg-yellow-700 text-white cursor-pointer ${
        isHidden && "hidden"
      }`}
      onClick={handleBuyNFTFunc}
    >
      {"Buy now"}
    </div>
  );
};

export default ItemDetails;
